import fs from 'node:fs/promises';
import path from 'node:path';
import { buildDirectSetGraph, buildManifestOnlyGraph, buildNpmGraph } from './lockfileGraph';
import type { DependencyGraph, DirectDependencies, PackageJson, PackageLock } from './lockfileGraph.types';
import {
  normalizePypiName,
  parseComposerJson,
  parseGemfileLock,
  parseGoMod,
  parsePom,
  parseRequirements,
} from './manifestParsers';

const NPM_LOCKFILES = ['package-lock.json', 'npm-shrinkwrap.json'];
const NPM_MANIFEST_LOCKFILES = ['yarn.lock', 'pnpm-lock.yaml'];

const readText = async (file: string) => fs.readFile(file, 'utf8').catch(() => undefined);

const readJson = async <T>(file: string): Promise<T | undefined> => {
  const text = await readText(file);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
};

const sibling = (file: string, name: string) => path.join(path.dirname(file), name);

const npmGraph = async (file: string) => {
  const manifest = (await readJson<PackageJson>(sibling(file, 'package.json'))) ?? {};
  const lock = NPM_LOCKFILES.includes(path.basename(file)) ? await readJson<PackageLock>(file) : undefined;
  return lock ? buildNpmGraph(lock, manifest) : buildManifestOnlyGraph(manifest);
};

const fromText = (parse: (text: string) => DirectDependencies, normalize?: (name: string) => string) =>
  async (file: string) => {
    const text = await readText(file);
    return text === undefined ? undefined : buildDirectSetGraph(parse(text), normalize);
  };

/** Builders per file name. Formats not listed here only report the packages, so direct/indirect stays unknown. */
const GRAPH_BUILDERS: Record<string, (file: string) => Promise<DependencyGraph | undefined>> = {
  ...Object.fromEntries([...NPM_LOCKFILES, ...NPM_MANIFEST_LOCKFILES].map((name) => [name, npmGraph])),
  'go.mod': fromText(parseGoMod),
  'Gemfile.lock': fromText(parseGemfileLock),
  'requirements.txt': fromText(parseRequirements, normalizePypiName),
  'pom.xml': fromText(parsePom),
  'composer.lock': async (file) => {
    const manifest = await readJson<Parameters<typeof parseComposerJson>[0]>(sibling(file, 'composer.json'));
    return manifest ? buildDirectSetGraph(parseComposerJson(manifest), (name) => name.toLowerCase()) : undefined;
  },
};

export const loadDependencyGraph = async (file: string): Promise<DependencyGraph | undefined> => {
  const name = path.basename(file);
  return Object.hasOwn(GRAPH_BUILDERS, name) ? GRAPH_BUILDERS[name]!(file) : undefined;
};
