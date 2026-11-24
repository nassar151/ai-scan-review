import type { CodeLocation, Finding } from '@scan/shared';

/** Code findings point at source lines; dependency findings at the dependency files that declare the package. */
export const whereLocations = (finding: Finding): CodeLocation[] =>
  finding.locations.length > 0 ? finding.locations : (finding.dependency?.manifests.map((path) => ({ path })) ?? []);
