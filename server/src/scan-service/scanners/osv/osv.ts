import path from 'node:path';
import { SCANNER_TOOL, TOOL_RUN_STATUS } from '@scan/shared';
import type { DependencyScanOutput, RawAdvisory, VulnerablePackage } from '../../../common/analysis/analysis.types';
import { runCommand, stderrTail } from '../../../common/utils/exec';
import { loadDependencyGraph } from '../../deps/loadGraph';
import { locatePackage } from '../../deps/locatePackage';
import type { DependencyGraph } from '../../deps/lockfileGraph.types';
import { findFixedVersion } from './fixedVersion';
import type { OsvOutput, OsvPackageResult, OsvVulnerability } from './osv.types';

const SCAN_TIMEOUT_MS = 5 * 60_000;
/** 0 = clean, 1 = vulnerabilities found, 128 = no packages found. */
const ACCEPTED_EXIT_CODES = [0, 1, 128];
const CVSS_TYPES = ['CVSS_V3', 'CVSS_V4'];
const DEV_GROUP = 'dev';
const PACKAGE_COUNT_PATTERN = /found (\d+) packages?/g;
const VERSION_PATTERN = /osv-scanner version: (\S+)/;
const MAX_DETAILS_LENGTH = 1500;
const MAX_REFERENCES = 5;

const pickVector = (vulnerability: OsvVulnerability) =>
  CVSS_TYPES.map((type) => vulnerability.severity?.find((entry) => entry.type === type)?.score).find(Boolean);

const groupScoreFor = (result: OsvPackageResult, id: string) => {
  const score = Number(result.groups?.find((group) => group.ids.includes(id))?.max_severity);
  return Number.isFinite(score) && score > 0 ? score : undefined;
};

const toAdvisory = (result: OsvPackageResult, vulnerability: OsvVulnerability): RawAdvisory => ({
  id: vulnerability.id,
  aliases: vulnerability.aliases ?? [],
  summary: vulnerability.summary?.trim() || vulnerability.id,
  details: (vulnerability.details ?? '').trim().slice(0, MAX_DETAILS_LENGTH),
  cvssVector: pickVector(vulnerability),
  databaseSeverity: vulnerability.database_specific?.severity,
  groupScore: groupScoreFor(result, vulnerability.id),
  fixedVersion: findFixedVersion(vulnerability.affected, result.package.name, result.package.version),
  cwe: vulnerability.database_specific?.cwe_ids ?? [],
  publishedAt: vulnerability.published,
  references: (vulnerability.references ?? []).map((reference) => reference.url).slice(0, MAX_REFERENCES),
});

export const parseOsvOutput = (
  output: OsvOutput,
  repoDir: string,
  graphs: Map<string, DependencyGraph | undefined>,
): VulnerablePackage[] =>
  (output.results ?? []).flatMap((source) =>
    (source.packages ?? [])
      .filter((result) => (result.vulnerabilities?.length ?? 0) > 0)
      .map((result) => {
        const { name, version, ecosystem } = result.package;
        const context = graphs.get(source.source.path)?.lookup(name, version);
        return {
          ecosystem,
          name,
          version,
          lockfile: path.relative(repoDir, source.source.path),
          isDirect: context?.isDirect,
          isDev: context?.isDev ?? result.dependency_groups?.includes(DEV_GROUP) ?? false,
          introducedVia: context?.introducedVia ?? [],
          advisories: (result.vulnerabilities ?? []).map((vulnerability) => toAdvisory(result, vulnerability)),
        };
      }),
  );

const readVersion = async () => {
  try {
    return VERSION_PATTERN.exec((await runCommand('osv-scanner', ['--version'])).stdout)?.[1];
  } catch {
    return undefined;
  }
};

export const runOsvScanner = async (repoDir: string, lockfiles: string[]): Promise<DependencyScanOutput> => {
  const started = Date.now();
  const graphs = new Map(
    await Promise.all(lockfiles.map(async (file) => [file, await loadDependencyGraph(file)] as const)),
  );

  const result = await runCommand(
    'osv-scanner',
    ['scan', 'source', '--format', 'json', ...lockfiles.flatMap((file) => ['-L', file])],
    { cwd: repoDir, timeoutMs: SCAN_TIMEOUT_MS },
  );
  if (!ACCEPTED_EXIT_CODES.includes(result.exitCode)) {
    throw new Error(`osv-scanner failed (exit ${result.exitCode}): ${stderrTail(result)}`);
  }

  let output: OsvOutput = {};
  if (result.stdout.trim()) {
    try {
      output = JSON.parse(result.stdout) as OsvOutput;
    } catch {
      throw new Error(`osv-scanner returned invalid JSON: ${stderrTail(result)}`);
    }
  }

  const packages = await Promise.all(
    parseOsvOutput(output, repoDir, graphs).map(async (pkg) => ({ ...pkg, location: await locatePackage(repoDir, pkg) })),
  );
  const dependenciesScanned = [...result.stderr.matchAll(PACKAGE_COUNT_PATTERN)].reduce(
    (total, match) => total + Number(match[1]),
    0,
  );

  return {
    packages,
    dependenciesScanned,
    directDependencies: [...graphs.values()].reduce((total, graph) => total + (graph?.directCount ?? 0), 0),
    tool: {
      tool: SCANNER_TOOL.OSV_SCANNER,
      version: await readVersion(),
      status: TOOL_RUN_STATUS.SUCCEEDED,
      durationMs: Date.now() - started,
      rawFindingCount: packages.reduce((total, pkg) => total + pkg.advisories.length, 0),
    },
  };
};
