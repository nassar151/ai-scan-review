import semver from 'semver';
import { normalizeVersion as normalize } from '../../../common/analysis/versions';
import type { OsvAffected } from './osv.types';

const VERSIONED_RANGE_TYPES = ['SEMVER', 'ECOSYSTEM'];

/**
 * Returns the version that fixes the advisory for the *installed* version, honoring multiple ranges
 * (e.g. 3.x fixed in 3.10.2 and 4.x fixed in 4.17.21). Undefined means no fix is published for this range.
 */
export const findFixedVersion = (
  affected: OsvAffected[] | undefined,
  packageName: string,
  installedVersion: string,
): string | undefined => {
  const installed = normalize(installedVersion);
  if (!installed) return undefined;

  for (const entry of affected ?? []) {
    if (entry.package && entry.package.name !== packageName) continue;

    for (const range of entry.ranges ?? []) {
      if (!VERSIONED_RANGE_TYPES.includes(range.type)) continue;
      let introduced: string | undefined;

      for (const event of range.events) {
        if (event.introduced !== undefined) {
          introduced = normalize(event.introduced);
          continue;
        }
        if (!introduced || semver.lt(installed, introduced)) continue;

        const fixed = normalize(event.fixed);
        if (fixed && semver.lt(installed, fixed)) return event.fixed;
        const lastAffected = normalize(event.last_affected);
        if (lastAffected && semver.lte(installed, lastAffected)) return undefined;
      }
    }
  }
  return undefined;
};
