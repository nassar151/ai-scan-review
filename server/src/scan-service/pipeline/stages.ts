import { SCAN_STATUS, SCANNER_TOOL, TOOL_RUN_STATUS, type ScannerTool } from '@scan/shared';
import { analyze } from '../../common/analysis/analyze';
import { removeDir, repoDirFor } from '../../common/repo/repoDir';
import { plural, toMessage } from '../../common/utils/text';
import { fetchRepoMetadata } from '../github/githubApi';
import { cloneRepo, shortSha } from '../repo/cloneRepo';
import { discoverDependencyFiles } from '../repo/discoverDependencyFiles';
import { runOsvScanner } from '../scanners/osv/osv';
import { runSemgrep } from '../scanners/semgrep/semgrep';
import type { PipelineContext, PipelineStage, StageOutcome } from './pipeline.types';
import { NO_DEPENDENCY_FILES } from './stages.consts';

export interface StageOptions {
  githubToken: string;
  maxRepoSizeMb: number;
  reposDir: string;
}

const requireRepoPath = (context: PipelineContext) => {
  if (!context.artifacts.repoPath) throw new Error('Repository was not cloned');
  return context.artifacts.repoPath;
};

/** A scanner crash degrades the result instead of failing the whole scan. */
const recordToolFailure = (context: PipelineContext, tool: ScannerTool, error: unknown): StageOutcome => {
  const message = toMessage(error);
  context.artifacts.tools.push({ tool, status: TOOL_RUN_STATUS.FAILED, message });
  context.artifacts.warnings.push(`${tool} failed: ${message}`);
  return { skipped: true, detail: `${tool} failed: ${message}` };
};

const cloneStage = ({ githubToken, maxRepoSizeMb, reposDir }: StageOptions): PipelineStage => ({
  status: SCAN_STATUS.CLONING,
  run: async (context) => {
    context.reportProgress('Checking repository on GitHub…');
    const metadata = await fetchRepoMetadata(context.repo, githubToken);
    if (metadata && metadata.sizeMb > maxRepoSizeMb) {
      throw new Error(`Repository is ${Math.round(metadata.sizeMb)} MB; the limit is ${maxRepoSizeMb} MB`);
    }

    context.reportProgress(`Cloning ${context.repo.owner}/${context.repo.name}${metadata ? ` (${metadata.defaultBranch})` : ''}…`);
    const cloned = await cloneRepo(context.repo, repoDirFor(reposDir, context.scanId), metadata?.defaultBranch);
    context.onCleanup(() => removeDir(cloned.dir));
    context.artifacts.repoPath = cloned.dir;
    context.updateRepo({ ...context.repo, defaultBranch: metadata?.defaultBranch, commitSha: cloned.commitSha });

    return { detail: `Cloned ${metadata?.defaultBranch ?? 'default branch'} at commit ${shortSha(cloned.commitSha)}` };
  },
});

const codeScanStage: PipelineStage = {
  status: SCAN_STATUS.SCANNING_CODE,
  run: async (context) => {
    context.reportProgress('Running Semgrep security, Node.js and secrets rules…');
    try {
      const output = await runSemgrep(requireRepoPath(context));
      context.artifacts.codeScan = output;
      context.artifacts.tools.push(output.tool);
      return { detail: `${plural(output.filesScanned, 'file')} scanned, ${plural(output.matches.length, 'raw match')}` };
    } catch (error) {
      return recordToolFailure(context, SCANNER_TOOL.SEMGREP, error);
    }
  },
};

const dependencyScanStage: PipelineStage = {
  status: SCAN_STATUS.SCANNING_DEPENDENCIES,
  run: async (context) => {
    const repoPath = requireRepoPath(context);
    context.reportProgress('Looking for dependency files (npm, Python, Go, Java, Ruby, Rust, PHP, .NET, …)…');
    const discovery = await discoverDependencyFiles(repoPath, context.reportProgress);
    context.artifacts.warnings.push(...discovery.warnings);

    if (discovery.files.length === 0) {
      context.artifacts.tools.push({ tool: SCANNER_TOOL.OSV_SCANNER, status: TOOL_RUN_STATUS.SKIPPED, message: NO_DEPENDENCY_FILES });
      return { skipped: true, detail: NO_DEPENDENCY_FILES };
    }

    const languages = [...new Set(discovery.files.map((file) => file.language))].join(', ');
    context.reportProgress(
      `Checking ${plural(discovery.files.length, 'dependency file')} (${languages}) against the OSV vulnerability database…`,
    );
    try {
      const output = await runOsvScanner(repoPath, discovery.files.map((file) => file.path));
      context.artifacts.dependencyScan = output;
      context.artifacts.tools.push(output.tool);
      const generated = discovery.files.filter((file) => file.generated).length;
      return {
        detail: `${plural(output.dependenciesScanned, 'dependency')} checked in ${languages} (direct and indirect), ${plural(output.packages.length, 'vulnerable package')} (${plural(output.tool.rawFindingCount ?? 0, 'advisory')})${generated > 0 ? `; generated ${plural(generated, 'missing lockfile')}` : ''}`,
      };
    } catch (error) {
      return recordToolFailure(context, SCANNER_TOOL.OSV_SCANNER, error);
    }
  },
};

const analyzeStage: PipelineStage = {
  status: SCAN_STATUS.ANALYZING,
  run: async (context) => {
    const { codeScan, dependencyScan, tools, warnings } = context.artifacts;
    if (!codeScan && !dependencyScan) {
      throw new Error(`No scanner completed successfully. ${warnings.join(' ')}`.trim());
    }

    context.reportProgress('Grouping, de-duplicating and prioritizing findings…');
    const result = analyze({ repo: context.repo, code: codeScan, dependencies: dependencyScan, tools, warnings });
    context.artifacts.result = result;
    return { detail: `${plural(result.stats.rawFindings, 'raw result')} → ${plural(result.findings.length, 'prioritized finding')}` };
  },
};

/** The scan service's stages. The AI investigation runs in the AI service afterwards. */
export const createScanStages = (options: StageOptions): PipelineStage[] => [
  cloneStage(options),
  codeScanStage,
  dependencyScanStage,
  analyzeStage,
];
