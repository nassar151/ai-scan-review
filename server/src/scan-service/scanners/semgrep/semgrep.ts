import fs from 'node:fs/promises';
import path from 'node:path';
import { SCANNER_TOOL, TOOL_RUN_STATUS } from '@scan/shared';
import type { CodeMatch, CodeScanOutput, RuleLevel, SemgrepSeverity } from '../../../common/analysis/analysis.types';
import { runCommand, stderrTail } from '../../../common/utils/exec';
import type { SemgrepMetadata, SemgrepOutput, SemgrepResult } from './semgrep.types';

/** Registry rule packs: broad security defaults, per-language security rules, and hardcoded secrets. */
const BASE_RULE_PACKS = ['p/default', 'p/secrets'];
const LANGUAGE_RULE_PACKS = [
  'p/javascript',
  'p/typescript',
  'p/nodejs',
  'p/expressjs',
  'p/python',
  'p/java',
  'p/golang',
  'p/csharp',
  'p/php',
  'p/ruby',
];
const RULE_PACKS = [...BASE_RULE_PACKS, ...LANGUAGE_RULE_PACKS];
const EXCLUDES = ['node_modules', 'dist', 'build', 'coverage', 'vendor', '*.min.js', '*.map'];
const SCAN_TIMEOUT_MS = 10 * 60_000;
const PER_FILE_TIMEOUT_S = '30';
const MAX_TARGET_BYTES = '1000000';
const ACCEPTED_EXIT_CODES = [0, 1];
const MAX_SNIPPET_LINES = 6;
const MAX_SNIPPET_LINE_LENGTH = 220;
const LEVELS: RuleLevel[] = ['HIGH', 'MEDIUM', 'LOW'];
const SEVERITIES: SemgrepSeverity[] = ['ERROR', 'WARNING', 'INFO'];

const toArray = (value: string[] | string | undefined): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toLevel = (value: string | undefined) => LEVELS.find((level) => level === value?.toUpperCase());

const toSeverity = (value: string): SemgrepSeverity =>
  SEVERITIES.find((severity) => severity === value.toUpperCase()) ?? 'WARNING';

const readSnippet = async (root: string, file: string, start: number, end: number) => {
  try {
    const lines = (await fs.readFile(path.join(root, file), 'utf8')).split('\n');
    const last = Math.min(end, start + MAX_SNIPPET_LINES - 1);
    return lines
      .slice(start - 1, last)
      .map((line) => (line.length > MAX_SNIPPET_LINE_LENGTH ? `${line.slice(0, MAX_SNIPPET_LINE_LENGTH)}…` : line))
      .join('\n');
  } catch {
    return undefined;
  }
};

const toMatch = async (root: string, result: SemgrepResult): Promise<CodeMatch> => {
  const metadata: SemgrepMetadata = result.extra.metadata ?? {};
  return {
    ruleId: result.check_id,
    path: result.path,
    line: result.start.line,
    endLine: result.end.line,
    message: result.extra.message.trim(),
    semgrepSeverity: toSeverity(result.extra.severity),
    confidence: toLevel(metadata.confidence),
    likelihood: toLevel(metadata.likelihood),
    impact: toLevel(metadata.impact),
    cwe: toArray(metadata.cwe),
    owasp: toArray(metadata.owasp),
    references: toArray(metadata.references),
    vulnerabilityClass: metadata.vulnerability_class ?? [],
    technology: metadata.technology ?? [],
    snippet: await readSnippet(root, result.path, result.start.line, result.end.line),
    fix: result.extra.fix,
    ruleUrl: metadata.source,
  };
};

export const parseSemgrepOutput = async (root: string, output: SemgrepOutput) => ({
  matches: await Promise.all(output.results.map((result) => toMatch(root, result))),
  filesScanned: output.paths?.scanned?.length ?? 0,
  errorCount: output.errors.length,
});

export const runSemgrep = async (repoDir: string): Promise<CodeScanOutput> => {
  const started = Date.now();
  const args = [
    'scan',
    ...RULE_PACKS.flatMap((pack) => ['--config', pack]),
    ...EXCLUDES.flatMap((pattern) => ['--exclude', pattern]),
    '--json', '--quiet', '--metrics=off', '--disable-version-check',
    '--timeout', PER_FILE_TIMEOUT_S,
    '--max-target-bytes', MAX_TARGET_BYTES,
    '.',
  ];
  const result = await runCommand('semgrep', args, {
    cwd: repoDir,
    timeoutMs: SCAN_TIMEOUT_MS,
    env: { ...process.env, SEMGREP_SEND_METRICS: 'off' },
  });

  if (!ACCEPTED_EXIT_CODES.includes(result.exitCode)) {
    throw new Error(`Semgrep failed (exit ${result.exitCode}): ${stderrTail(result)}`);
  }

  let output: SemgrepOutput;
  try {
    output = JSON.parse(result.stdout) as SemgrepOutput;
  } catch {
    throw new Error(`Semgrep returned invalid JSON: ${stderrTail(result)}`);
  }

  const parsed = await parseSemgrepOutput(repoDir, output);
  return {
    matches: parsed.matches,
    filesScanned: parsed.filesScanned,
    tool: {
      tool: SCANNER_TOOL.SEMGREP,
      version: output.version,
      status: TOOL_RUN_STATUS.SUCCEEDED,
      durationMs: Date.now() - started,
      rawFindingCount: parsed.matches.length,
      message: parsed.errorCount > 0 ? `${parsed.errorCount} file(s) could not be parsed` : undefined,
    },
  };
};
