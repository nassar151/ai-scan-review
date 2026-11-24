import fs from 'node:fs/promises';
import path from 'node:path';
import type { CodeLocation } from '@scan/shared';
import { DECLARING_MANIFEST, MAVEN_NAME_SEPARATOR, VERSION_LOOKAHEAD_LINES } from './locatePackage.consts';

interface PackageRef {
  name: string;
  version: string;
  /** Repo-relative lockfile path. */
  lockfile: string;
  isDirect?: boolean;
}

interface LineSpan {
  start: number;
  end: number;
}

const REGEXP_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const LEADING_SPACES = /^\s*/;

const namePattern = (name: string) => {
  const searchName = name.split(MAVEN_NAME_SEPARATOR).at(-1)!.replace(REGEXP_SPECIAL, '\\$&');
  return new RegExp(`(^|[^\\w.-])${searchName}($|[^\\w.-])`, 'i');
};

/** First line naming the package; with a version, prefer an entry whose version follows within a few lines. */
const findSpan = (lines: string[], name: string, version?: string): LineSpan | undefined => {
  const pattern = namePattern(name);
  const starts = lines.flatMap((line, index) => (pattern.test(line) ? [index] : []));
  const withVersion = version
    ? starts
        .map((start) => ({ start, offset: lines.slice(start, start + VERSION_LOOKAHEAD_LINES + 1).findIndex((line) => line.includes(version)) }))
        .find(({ offset }) => offset >= 0)
    : undefined;
  if (withVersion) return { start: withVersion.start, end: withVersion.start + withVersion.offset };
  return starts[0] === undefined ? undefined : { start: starts[0], end: starts[0] };
};

const dedent = (lines: string[]) => {
  const indent = Math.min(...lines.map((line) => LEADING_SPACES.exec(line)![0].length));
  return lines.map((line) => line.slice(indent).trimEnd()).join('\n');
};

const locateIn = async (repoDir: string, file: string, name: string, version?: string): Promise<CodeLocation | undefined> => {
  const text = await fs.readFile(path.join(repoDir, file), 'utf8').catch(() => undefined);
  if (text === undefined) return undefined;
  const lines = text.split('\n');
  const span = findSpan(lines, name, version);
  if (!span) return undefined;
  return { path: file, line: span.start + 1, endLine: span.end + 1, snippet: dedent(lines.slice(span.start, span.end + 1)) };
};

const declaringManifest = (lockfile: string) => {
  const manifest = DECLARING_MANIFEST[path.basename(lockfile)];
  return manifest ? path.join(path.dirname(lockfile), manifest) : undefined;
};

/**
 * Where a vulnerable package appears in the repo: the declaring manifest line for direct dependencies
 * (what the user edits), otherwise its lockfile entry. Falls back to the lockfile path alone.
 */
export const locatePackage = async (repoDir: string, pkg: PackageRef): Promise<CodeLocation> => {
  const manifest = pkg.isDirect === false ? undefined : declaringManifest(pkg.lockfile);
  return (
    (manifest && (await locateIn(repoDir, manifest, pkg.name))) ||
    (await locateIn(repoDir, pkg.lockfile, pkg.name, pkg.version)) || { path: pkg.lockfile }
  );
};
