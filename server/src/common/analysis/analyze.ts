import {
  AI_STATUS,
  FINDING_TYPE,
  PRIORITY,
  SEVERITY_ORDER,
  type Finding,
  type FindingTypeCounts,
  type RepoRef,
  type ScanResult,
  type SeverityCounts,
  type ToolRun,
} from '@scan/shared';
import { plural } from '../utils/text';
import type { CodeScanOutput, DependencyScanOutput } from './analysis.types';
import { buildCodeFindings } from './codeFindings';
import { buildDependencyFindings } from './dependencyFindings';
import { buildNextActions } from './nextActions';
import { compareFindings, gradeFor } from './scoring';

export interface AnalysisInput {
  repo: RepoRef;
  code?: CodeScanOutput;
  dependencies?: DependencyScanOutput;
  tools: ToolRun[];
  warnings: string[];
}

const countBy = <K extends string>(keys: readonly K[], values: K[]) =>
  Object.fromEntries(keys.map((key) => [key, values.filter((value) => value === key).length])) as Record<K, number>;

const headlineFor = (findings: Finding[], repo: RepoRef) => {
  const fixNow = findings.filter((finding) => finding.priority === PRIORITY.FIX_NOW).length;
  const fixSoon = findings.filter((finding) => finding.priority === PRIORITY.FIX_SOON).length;
  if (fixNow > 0) return `${plural(fixNow, 'issue')} in ${repo.name} should be fixed now`;
  if (fixSoon > 0) return `No urgent issues in ${repo.name}; ${plural(fixSoon, 'issue')} to schedule`;
  return findings.length > 0 ? `No significant risks in ${repo.name}; only low-priority items` : `No security issues found in ${repo.name}`;
};

const summaryFor = (findings: Finding[], input: AnalysisInput, rawFindings: number) => {
  const byType = (type: string) => findings.filter((finding) => finding.type === type);
  const dependencyFindings = byType(FINDING_TYPE.DEPENDENCY);
  const advisoryCount = dependencyFindings.reduce((total, finding) => total + (finding.dependency?.advisories.length ?? 0), 0);
  const prodDependencies = dependencyFindings.filter((finding) => !finding.dependency?.isDev).length;

  return [
    `Scanned ${plural(input.code?.filesScanned ?? 0, 'file')} and ${plural(input.dependencies?.dependenciesScanned ?? 0, 'dependency')}.`,
    `${rawFindings} raw scanner results were grouped into ${plural(findings.length, 'finding')}:`,
    `${plural(byType(FINDING_TYPE.SECRET).length, 'exposed secret')}, ${plural(byType(FINDING_TYPE.CODE).length, 'code issue')},`,
    `and ${plural(dependencyFindings.length, 'vulnerable package')} (${plural(advisoryCount, 'advisory')}, ${prodDependencies} in production dependencies).`,
  ].join(' ');
};

/** Everything derived from the findings list; recomputed after the AI agent changes ratings. */
export const summarizeFindings = (repo: RepoRef, unsorted: Finding[]) => {
  const findings = [...unsorted].sort(compareFindings);
  return {
    findings,
    grade: gradeFor(findings),
    riskScore: Math.max(0, ...findings.map((finding) => finding.riskScore)),
    headline: headlineFor(findings, repo),
    nextActions: buildNextActions(findings),
    severityCounts: countBy(SEVERITY_ORDER, findings.map((finding) => finding.severity)) as SeverityCounts,
    typeCounts: countBy(
      Object.values(FINDING_TYPE),
      findings.map((finding) => finding.type),
    ) as FindingTypeCounts,
  };
};

/** Deterministic analysis: normalize, group, score and prioritize. The AI agent runs afterwards. */
export const analyze = (input: AnalysisInput): ScanResult => {
  const derived = summarizeFindings(input.repo, [
    ...buildCodeFindings(input.code?.matches ?? []),
    ...buildDependencyFindings(input.dependencies?.packages ?? []),
  ]);

  const rawFindings =
    (input.code?.matches.length ?? 0) +
    (input.dependencies?.packages.reduce((total, pkg) => total + pkg.advisories.length, 0) ?? 0);

  return {
    ...derived,
    summary: summaryFor(derived.findings, input, rawFindings),
    stats: {
      filesScanned: input.code?.filesScanned ?? 0,
      dependenciesScanned: input.dependencies?.dependenciesScanned ?? 0,
      directDependencies: input.dependencies?.directDependencies ?? 0,
      rawFindings,
    },
    tools: input.tools,
    ai: { status: AI_STATUS.UNAVAILABLE, message: 'Not run yet', investigated: 0, changed: 0, falsePositives: 0, failed: 0 },
    warnings: input.warnings,
  };
};
