import fs from 'node:fs/promises';
import path from 'node:path';
import { MAX_SEARCH_DEPTH, SKIPPED_DIRS } from './walkRepo.consts';

/** Absolute paths of files whose name passes the filter, skipping vendored, generated and hidden folders. */
export const findFiles = async (
  root: string,
  matches: (fileName: string) => boolean,
  maxDepth: number = MAX_SEARCH_DEPTH,
): Promise<string[]> => {
  const found: string[] = [];
  const walk = async (dir: string, depth: number) => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    entries.filter((entry) => entry.isFile() && matches(entry.name)).forEach((entry) => found.push(path.join(dir, entry.name)));
    if (depth >= maxDepth) return;
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !SKIPPED_DIRS.has(entry.name) && !entry.name.startsWith('.'))
        .map((entry) => walk(path.join(dir, entry.name), depth + 1)),
    );
  };
  await walk(root, 0);
  return found.sort((a, b) => a.length - b.length || a.localeCompare(b));
};
