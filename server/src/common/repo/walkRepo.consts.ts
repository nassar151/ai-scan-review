/** Folders never searched: dependencies, build output, caches and virtual environments. */
export const SKIPPED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  'venv',
  '__pycache__',
  'site-packages',
  'target',
  'obj',
  'Pods',
  'bower_components',
]);

export const MAX_SEARCH_DEPTH = 6;
