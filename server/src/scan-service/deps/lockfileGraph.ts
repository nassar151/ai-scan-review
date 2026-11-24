import type {
  DependencyContext,
  DependencyGraph,
  DirectDependencies,
  LockPackage,
  LockV1Dependency,
  PackageJson,
  PackageLock,
} from './lockfileGraph.types';

const NODE_MODULES = 'node_modules/';
const NESTED_SEPARATOR = '/node_modules/';
const ROOT_KEY = '';
const MAX_PATHS = 5;
const MAX_EXPANSIONS = 5000;

const nameFromKey = (key: string) => key.slice(key.lastIndexOf(NODE_MODULES) + NODE_MODULES.length);
const isWorkspaceKey = (key: string) => key !== ROOT_KEY && !key.includes(NODE_MODULES);
const isRootKey = (key: string) => key === ROOT_KEY || isWorkspaceKey(key);

const parentScope = (key: string): string | undefined => {
  if (key === ROOT_KEY) return undefined;
  const nested = key.lastIndexOf(NESTED_SEPARATOR);
  if (nested >= 0) return key.slice(0, nested);
  return ROOT_KEY;
};

/** Converts a v1 nested tree into v2-style flat keys ("node_modules/a/node_modules/b"). */
const flattenV1 = (
  dependencies: Record<string, LockV1Dependency>,
  prefix: string,
  target: Record<string, LockPackage>,
) => {
  Object.entries(dependencies).forEach(([name, entry]) => {
    const key = prefix ? `${prefix}${NESTED_SEPARATOR}${name}` : `${NODE_MODULES}${name}`;
    target[key] = { version: entry.version, dev: entry.dev, dependencies: entry.requires };
    if (entry.dependencies) flattenV1(entry.dependencies, key, target);
  });
};

const toPackagesMap = (lock: PackageLock, manifest: PackageJson): Record<string, LockPackage> => {
  if (lock.packages) return lock.packages;
  const packages: Record<string, LockPackage> = {
    [ROOT_KEY]: { dependencies: manifest.dependencies, devDependencies: manifest.devDependencies },
  };
  flattenV1(lock.dependencies ?? {}, '', packages);
  return packages;
};

/** Node module resolution: look in the nearest node_modules, walking up the tree. */
const resolveDependency = (packages: Record<string, LockPackage>, fromKey: string, name: string) => {
  let scope: string | undefined = fromKey;
  while (scope !== undefined) {
    const candidate = scope ? `${scope}${NESTED_SEPARATOR}${name}` : `${NODE_MODULES}${name}`;
    const entry = packages[candidate];
    if (entry) {
      return entry.link && entry.resolved !== undefined && packages[entry.resolved] ? entry.resolved : candidate;
    }
    scope = parentScope(scope);
  }
  return undefined;
};

const dependencyNames = (key: string, entry: LockPackage) => [
  ...Object.keys(entry.dependencies ?? {}),
  ...Object.keys(entry.optionalDependencies ?? {}),
  ...Object.keys(entry.peerDependencies ?? {}),
  ...(isRootKey(key) ? Object.keys(entry.devDependencies ?? {}) : []),
];

/** Builds a reverse (child -> parents) graph from an npm lockfile. */
export const buildNpmGraph = (lock: PackageLock, manifest: PackageJson): DependencyGraph => {
  const packages = toPackagesMap(lock, manifest);
  const parents = new Map<string, Set<string>>();

  Object.entries(packages).forEach(([key, entry]) => {
    if (entry.link) return;
    dependencyNames(key, entry).forEach((name) => {
      const child = resolveDependency(packages, key, name);
      if (!child) return;
      if (!parents.has(child)) parents.set(child, new Set());
      parents.get(child)!.add(key);
    });
  });

  const pathsTo = (target: string): string[][] => {
    const found: string[][] = [];
    const queue: Array<{ key: string; chain: string[] }> = [{ key: target, chain: [target] }];
    let expansions = 0;

    while (queue.length > 0 && found.length < MAX_PATHS && expansions < MAX_EXPANSIONS) {
      const { key, chain } = queue.shift()!;
      expansions += 1;
      for (const parent of parents.get(key) ?? []) {
        if (isRootKey(parent)) {
          found.push([...chain].reverse().map(nameFromKey));
        } else if (!chain.includes(parent)) {
          queue.push({ key: parent, chain: [...chain, parent] });
        }
      }
    }
    return found;
  };

  const rootDirect = Object.entries(packages)
    .filter(([key]) => isRootKey(key))
    .flatMap(([key, entry]) => dependencyNames(key, entry));

  const isDevRoot = (chain: string[]) => packages[`${NODE_MODULES}${chain[0]}`]?.dev === true;

  return {
    directCount: new Set(rootDirect).size,
    lookup: (name, version): DependencyContext => {
      const targets = Object.entries(packages).filter(
        ([key, entry]) => key.includes(NODE_MODULES) && nameFromKey(key) === name && entry.version === version,
      );
      // Production chains first: that is the dependency the user must upgrade to fix what ships.
      const introducedVia = targets
        .flatMap(([key]) => pathsTo(key))
        .sort((a, b) => Number(isDevRoot(a)) - Number(isDevRoot(b)) || a.length - b.length)
        .slice(0, MAX_PATHS);

      return {
        isDirect: introducedVia.some((chain) => chain.length === 1),
        isDev: targets.length > 0 ? targets.every(([, entry]) => entry.dev === true) : undefined,
        introducedVia,
      };
    },
  };
};

const normalizeParents = (parents: Record<string, string[]>, normalize: (name: string) => string) => {
  const map = new Map<string, Set<string>>();
  Object.entries(parents).forEach(([child, names]) => {
    const key = normalize(child);
    map.set(key, new Set([...(map.get(key) ?? []), ...names.map(normalize)]));
  });
  return map;
};

/** Shortest chains from a direct dependency down to `target`, walking child -> parent edges. */
const chainsToDirect = (target: string, parents: Map<string, Set<string>>, isDirect: (name: string) => boolean) => {
  const found: string[][] = [];
  const queue: string[][] = [[target]];
  let expansions = 0;
  while (queue.length > 0 && found.length < MAX_PATHS && expansions < MAX_EXPANSIONS) {
    const chain = queue.shift()!;
    expansions += 1;
    for (const parent of parents.get(chain[chain.length - 1]!) ?? []) {
      if (chain.includes(parent)) continue;
      if (isDirect(parent)) found.push([...chain, parent].reverse());
      else queue.push([...chain, parent]);
    }
  }
  return found.slice(0, MAX_PATHS);
};

/**
 * Graph for formats that list the direct dependencies (yarn/pnpm via package.json, go.mod, Gemfile.lock,
 * requirements.txt, pom.xml, composer.json). When `parents` is known, indirect packages get their chains too.
 */
export const buildDirectSetGraph = (
  direct: DirectDependencies,
  normalize: (name: string) => string = (name) => name,
): DependencyGraph => {
  const prod = new Set(direct.prod.map(normalize));
  const dev = new Set(direct.dev.map(normalize));
  const parents = normalizeParents(direct.parents ?? {}, normalize);
  const isDirect = (key: string) => prod.has(key) || dev.has(key);

  return {
    directCount: new Set([...prod, ...dev]).size,
    lookup: (name) => {
      const key = normalize(name);
      if (isDirect(key)) return { isDirect: true, isDev: !prod.has(key), introducedVia: [[key]] };
      const introducedVia = chainsToDirect(key, parents, isDirect);
      return {
        isDirect: false,
        isDev: introducedVia.length > 0 ? introducedVia.every((chain) => !prod.has(chain[0]!)) : undefined,
        introducedVia,
      };
    },
  };
};

export const buildManifestOnlyGraph = (manifest: PackageJson): DependencyGraph =>
  buildDirectSetGraph({
    prod: [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {})],
    dev: Object.keys(manifest.devDependencies ?? {}),
  });
