import fs from 'node:fs/promises';
import path from 'node:path';
import type { z } from 'zod';
import { findFiles } from '../../common/repo/walkRepo';
import { toMessage } from '../../common/utils/text';
import {
  BINARY_SNIFF_BYTES,
  CODE_SEARCH_DEPTH,
  HIDDEN_LISTING_ENTRIES,
  LEADING_SLASHES,
  MAX_CACHED_BYTES,
  MAX_COUNTED_MATCHES,
  MAX_LINE_CHARS,
  MAX_LIST_ENTRIES,
  MAX_MATCHED_LINE_CHARS,
  MAX_PATTERN_LENGTH,
  MAX_READ_LINES,
  MAX_SEARCH_RESULTS,
  MAX_SEARCHED_FILE_BYTES,
  NUL_CHAR,
  TOOL_NAME,
} from './investigation.consts';
import { listFilesArgs, readFileArgs, searchCodeArgs } from './investigation.schema';
import type { RepoTools, ToolExecution } from './investigation.types';

const toPosix = (file: string) => file.split(path.sep).join('/');
const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${path.sep}`);
export const cleanRelative = (relative: string) => toPosix(relative.trim()).replace(LEADING_SLASHES, '');

const lineMatcher = (pattern: string, isRegex: boolean): ((line: string) => boolean) | string => {
  if (!isRegex) {
    const needle = pattern.toLowerCase();
    return (line) => line.toLowerCase().includes(needle);
  }
  try {
    const regex = new RegExp(pattern, 'i');
    return (line) => regex.test(line);
  } catch (error) {
    return `Invalid regular expression: ${toMessage(error)}`;
  }
};

const parseArgs = <T>(schema: z.ZodType<T>, raw: string): T | string => {
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : `Invalid arguments: ${parsed.error.message}`;
  } catch {
    return 'Invalid arguments: not JSON';
  }
};

/**
 * Read-only tools over the cloned repository. Every path is resolved (symlinks included) and must stay
 * inside the repo; binaries and files over 1 MB are skipped. Nothing is ever executed.
 */
export const createRepoTools = async (repoPath: string): Promise<RepoTools> => {
  const root = await fs.realpath(repoPath);
  let files: Promise<string[]> | undefined;
  const allFiles = () => (files ??= findFiles(root, () => true, CODE_SEARCH_DEPTH));
  const cache = new Map<string, string | undefined>();
  let cachedBytes = 0;

  const resolveInside = async (relative: string) => {
    const candidate = path.resolve(root, cleanRelative(relative));
    if (!isInside(root, candidate)) return undefined;
    const real = await fs.realpath(candidate).catch(() => undefined);
    return real && isInside(root, real) ? real : undefined;
  };

  const readText = async (file: string) => {
    if (cache.has(file)) return cache.get(file);
    const stat = await fs.stat(file).catch(() => undefined);
    const content =
      stat?.isFile() && stat.size <= MAX_SEARCHED_FILE_BYTES ? await fs.readFile(file, 'utf8').catch(() => undefined) : undefined;
    const text = content?.slice(0, BINARY_SNIFF_BYTES).includes(NUL_CHAR) ? undefined : content;
    if (cachedBytes + (text?.length ?? 0) <= MAX_CACHED_BYTES) {
      cache.set(file, text);
      cachedBytes += text?.length ?? 0;
    }
    return text;
  };

  const searchCode = async (raw: string): Promise<ToolExecution> => {
    const args = parseArgs(searchCodeArgs, raw);
    if (typeof args === 'string') return { text: args, log: { name: TOOL_NAME.SEARCH_CODE } };
    const log = { name: TOOL_NAME.SEARCH_CODE, searchPattern: args.pattern };
    if (args.pattern.length > MAX_PATTERN_LENGTH) return { text: `Pattern longer than ${MAX_PATTERN_LENGTH} characters`, log };
    const matches = lineMatcher(args.pattern, args.isRegex);
    if (typeof matches === 'string') return { text: matches, log };

    const prefix = args.pathPrefix ? cleanRelative(args.pathPrefix) : '';
    const shown: string[] = [];
    let count = 0;
    for (const file of await allFiles()) {
      if (count >= MAX_COUNTED_MATCHES) break;
      const relative = toPosix(path.relative(root, file));
      if (prefix && !relative.startsWith(prefix)) continue;
      const text = await readText(file);
      text?.split('\n').forEach((line, index) => {
        if (!matches(line.slice(0, MAX_MATCHED_LINE_CHARS))) return;
        count += 1;
        if (shown.length < MAX_SEARCH_RESULTS) shown.push(`${relative}:${index + 1}: ${line.trim().slice(0, MAX_LINE_CHARS)}`);
      });
    }

    const total = count >= MAX_COUNTED_MATCHES ? `${MAX_COUNTED_MATCHES}+` : `${count}`;
    const header = count === 0 ? `No matches for "${args.pattern}".` : `${total} matches${count > shown.length ? ` (first ${shown.length} shown)` : ''}:`;
    return { text: [header, ...shown].join('\n'), log: { ...log, matchCount: count } };
  };

  const readFile = async (raw: string): Promise<ToolExecution> => {
    const log = { name: TOOL_NAME.READ_FILE };
    const args = parseArgs(readFileArgs, raw);
    if (typeof args === 'string') return { text: args, log };
    const file = await resolveInside(args.path);
    const text = file ? await readText(file) : undefined;
    if (text === undefined) return { text: `Cannot read "${args.path}" (missing, outside the repo, binary or over 1 MB)`, log };

    const lines = text.split('\n');
    const start = Math.max(1, Math.floor(args.startLine ?? 1));
    const end = Math.min(lines.length, Math.floor(args.endLine ?? lines.length), start + MAX_READ_LINES - 1);
    const body = lines.slice(start - 1, end).map((line, index) => `${start + index}| ${line}`);
    return { text: [`${cleanRelative(args.path)} (lines ${start}-${end} of ${lines.length})`, ...body].join('\n'), log };
  };

  const listFiles = async (raw: string): Promise<ToolExecution> => {
    const log = { name: TOOL_NAME.LIST_FILES };
    const args = parseArgs(listFilesArgs, raw);
    if (typeof args === 'string') return { text: args, log };
    const dir = await resolveInside(args.path ?? '');
    const entries = dir ? await fs.readdir(dir, { withFileTypes: true }).catch(() => undefined) : undefined;
    if (!entries) return { text: `Cannot list "${args.path ?? '.'}"`, log };
    const names = entries
      .filter((entry) => !HIDDEN_LISTING_ENTRIES.has(entry.name))
      .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
      .sort();
    const extra = names.length - MAX_LIST_ENTRIES;
    return { text: [...names.slice(0, MAX_LIST_ENTRIES), ...(extra > 0 ? [`… ${extra} more`] : [])].join('\n'), log };
  };

  const handlers: Record<string, (raw: string) => Promise<ToolExecution>> = {
    [TOOL_NAME.SEARCH_CODE]: searchCode,
    [TOOL_NAME.READ_FILE]: readFile,
    [TOOL_NAME.LIST_FILES]: listFiles,
  };

  const readLines = async (relative: string) => {
    const file = await resolveInside(relative);
    const text = file ? await readText(file) : undefined;
    return text?.split('\n');
  };

  return {
    execute: async (name, rawArguments) =>
      Object.hasOwn(handlers, name)
        ? handlers[name]!(rawArguments)
        : { text: `Unknown tool "${name}"`, log: { name } },
    lineCount: async (relative) => (await readLines(relative))?.length,
    readLines,
  };
};
