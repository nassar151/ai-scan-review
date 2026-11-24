import fs from 'node:fs/promises';
import path from 'node:path';
import { findFiles } from '../../common/repo/walkRepo';
import { runCommand, stderrTail } from '../../common/utils/exec';
import {
  LOCKFILE_GENERATION_TIMEOUT_MS,
  LOCKFILE_NAMES,
  MAX_GENERATED_LOCKFILES,
  NPM_LOCKFILE,
  PACKAGE_JSON,
} from './discoverProjects.consts';

export interface NodeProject {
  /** Folder relative to the repo root ("" for the root). */
  dir: string;
  /** Absolute lockfile path, when one exists or was generated. */
  lockfilePath?: string;
  lockfileGenerated: boolean;
}

export interface DiscoveryResult {
  projects: NodeProject[];
  warnings: string[];
}

const findPackageDirs = async (root: string): Promise<string[]> =>
  (await findFiles(root, (name) => name === PACKAGE_JSON)).map((file) => path.dirname(file));

const findLockfile = async (dir: string): Promise<string | undefined> => {
  const entries = new Set(await fs.readdir(dir));
  const name = LOCKFILE_NAMES.find((candidate) => entries.has(candidate));
  return name ? path.join(dir, name) : undefined;
};

/** Resolves the full dependency tree without installing packages or running any lifecycle script. */
const generateLockfile = async (dir: string): Promise<string> => {
  const result = await runCommand(
    'npm',
    ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps'],
    { cwd: dir, timeoutMs: LOCKFILE_GENERATION_TIMEOUT_MS },
  );
  if (result.exitCode !== 0) {
    throw new Error(stderrTail(result).split('\n').slice(-3).join(' '));
  }
  return path.join(dir, NPM_LOCKFILE);
};

const isInside = (child: string, parent: string) => child.startsWith(`${parent}${path.sep}`);

/**
 * Finds every npm project in the repository. Projects without a lockfile get one generated so that
 * indirect (transitive) dependencies are scanned too. Workspace packages covered by a lockfile in an
 * ancestor folder are not scanned separately.
 */
export const discoverNodeProjects = async (
  root: string,
  onProgress: (message: string) => void,
): Promise<DiscoveryResult> => {
  const projects: NodeProject[] = [];
  const warnings: string[] = [];
  const coveredDirs: string[] = [];
  let generatedCount = 0;

  for (const dir of await findPackageDirs(root)) {
    if (coveredDirs.some((covered) => isInside(dir, covered))) continue;

    const relativeDir = path.relative(root, dir);
    const displayDir = relativeDir || 'repository root';
    const existing = await findLockfile(dir);
    if (existing) {
      projects.push({ dir: relativeDir, lockfilePath: existing, lockfileGenerated: false });
      coveredDirs.push(dir);
      continue;
    }

    if (generatedCount >= MAX_GENERATED_LOCKFILES) {
      warnings.push(`Skipped ${displayDir}: too many projects without a lockfile`);
      continue;
    }

    onProgress(`Resolving dependency tree for ${displayDir} (no lockfile committed)…`);
    generatedCount += 1;
    try {
      const lockfilePath = await generateLockfile(dir);
      projects.push({ dir: relativeDir, lockfilePath, lockfileGenerated: true });
      coveredDirs.push(dir);
    } catch (error) {
      warnings.push(`Could not resolve dependencies for ${displayDir}: ${(error as Error).message}`);
      projects.push({ dir: relativeDir, lockfileGenerated: false });
    }
  }

  return { projects, warnings };
};
