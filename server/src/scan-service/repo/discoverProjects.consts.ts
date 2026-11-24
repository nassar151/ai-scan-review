/**
 * Dependency files of non-npm ecosystems that osv-scanner can read, mapped to a display language.
 * npm is handled separately because missing npm lockfiles are generated.
 */
export const OTHER_DEPENDENCY_FILES: Record<string, string> = {
  'requirements.txt': 'Python',
  'Pipfile.lock': 'Python',
  'poetry.lock': 'Python',
  'uv.lock': 'Python',
  'pdm.lock': 'Python',
  'go.mod': 'Go',
  'pom.xml': 'Java',
  'gradle.lockfile': 'Java',
  'buildscript-gradle.lockfile': 'Java',
  'Cargo.lock': 'Rust',
  'Gemfile.lock': 'Ruby',
  'composer.lock': 'PHP',
  'packages.lock.json': '.NET',
  'pubspec.lock': 'Dart',
  'mix.lock': 'Elixir',
  'renv.lock': 'R',
  'conan.lock': 'C/C++',
};
export const NPM_LANGUAGE = 'JavaScript';

/** Ordered by preference when several exist in the same folder. */
export const LOCKFILE_NAMES = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml'];
export const NPM_LOCKFILE = 'package-lock.json';
export const PACKAGE_JSON = 'package.json';

export const MAX_GENERATED_LOCKFILES = 5;
export const LOCKFILE_GENERATION_TIMEOUT_MS = 3 * 60_000;
