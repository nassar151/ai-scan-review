import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepoRef } from '@scan/shared';
import { removeDir } from '../../common/repo/repoDir';
import { runCommand, stderrTail } from '../../common/utils/exec';

const CLONE_TIMEOUT_MS = 3 * 60_000;
const SHORT_SHA_LENGTH = 7;

export interface ClonedRepo {
  dir: string;
  commitSha: string;
}

export const shortSha = (sha: string) => sha.slice(0, SHORT_SHA_LENGTH);

/**
 * Shallow, single-branch clone into `targetDir` (replaced if it exists).
 * Hooks are disabled and prompts suppressed so nothing from the repository runs and the clone never blocks.
 */
export const cloneRepo = async (repo: RepoRef, targetDir: string, branch?: string): Promise<ClonedRepo> => {
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  const dir = path.join(await fs.realpath(path.dirname(targetDir)), path.basename(targetDir));
  await removeDir(dir);
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1' };

  const clone = await runCommand(
    'git',
    [
      '-c', 'core.hooksPath=/dev/null',
      '-c', 'core.symlinks=false',
      'clone', '--depth', '1', '--single-branch', '--no-tags',
      ...(branch ? ['--branch', branch] : []),
      `${repo.url}.git`, dir,
    ],
    { env, timeoutMs: CLONE_TIMEOUT_MS },
  ).catch(async (error: unknown) => {
    await removeDir(dir);
    throw error;
  });

  if (clone.exitCode !== 0) {
    await removeDir(dir);
    throw new Error(`git clone failed: ${stderrTail(clone)}`);
  }

  const head = await runCommand('git', ['rev-parse', 'HEAD'], { cwd: dir, env });
  return { dir, commitSha: head.stdout.trim() };
};