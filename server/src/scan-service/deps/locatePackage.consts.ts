/** Lockfile name → the file where direct dependencies are declared (the one the user edits). */
export const DECLARING_MANIFEST: Record<string, string> = {
  'package-lock.json': 'package.json',
  'npm-shrinkwrap.json': 'package.json',
  'yarn.lock': 'package.json',
  'pnpm-lock.yaml': 'package.json',
  'composer.lock': 'composer.json',
  'Gemfile.lock': 'Gemfile',
  'Cargo.lock': 'Cargo.toml',
  'poetry.lock': 'pyproject.toml',
  'Pipfile.lock': 'Pipfile',
};

/** How many lines after the package name its version may appear in a lockfile entry. */
export const VERSION_LOOKAHEAD_LINES = 3;

/** Maven names are "group:artifact"; files list the artifact on its own. */
export const MAVEN_NAME_SEPARATOR = ':';
