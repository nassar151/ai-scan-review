export type DependencyMap = Record<string, string>;

/** package-lock v2/v3 `packages` entry (v1 lockfiles are converted to this shape). */
export interface LockPackage {
  version?: string;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  dev?: boolean;
  link?: boolean;
  resolved?: string;
}

/** package-lock v1 nested `dependencies` entry. */
export interface LockV1Dependency {
  version: string;
  dev?: boolean;
  requires?: DependencyMap;
  dependencies?: Record<string, LockV1Dependency>;
}

export interface PackageLock {
  lockfileVersion?: number;
  packages?: Record<string, LockPackage>;
  dependencies?: Record<string, LockV1Dependency>;
}

export interface PackageJson {
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
}

export interface DependencyContext {
  isDirect: boolean;
  /** undefined when the lockfile format does not tell us. */
  isDev?: boolean;
  /** Chains of package names, from a direct dependency down to the package itself. */
  introducedVia: string[][];
}

/** Direct dependency names declared in a manifest, split by whether they ship to production. */
export interface DirectDependencies {
  prod: string[];
  dev: string[];
  /** child -> packages that require it, when the file records the tree (Gemfile.lock specs, pip-compile "# via"). */
  parents?: Record<string, string[]>;
}

export interface DependencyGraph {
  directCount: number;
  lookup(name: string, version: string): DependencyContext;
}
