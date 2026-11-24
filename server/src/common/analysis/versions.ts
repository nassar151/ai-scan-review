import semver from 'semver';

const ZERO_VERSION = '0.0.0';

/** Loose version → semver ("1.2" → "1.2.0", "0" → "0.0.0"); undefined when it can't be read. */
export const normalizeVersion = (version: string | undefined) =>
  version === undefined || version === '0' ? ZERO_VERSION : (semver.valid(semver.coerce(version, { loose: true })) ?? undefined);

/** Highest version among the advisories' fixes, so one upgrade resolves all of them. */
export const highestVersion = (versions: string[]): string | undefined =>
  versions.reduce<string | undefined>((highest, version) => {
    const candidate = normalizeVersion(version);
    if (!candidate) return highest;
    return !highest || semver.gt(candidate, normalizeVersion(highest)!) ? version : highest;
  }, undefined);

export const upgradeType = (from: string, to: string): string | undefined => {
  const a = normalizeVersion(from);
  const b = normalizeVersion(to);
  if (!a || !b) return undefined;
  const diff = semver.diff(a, b);
  return diff?.replace('pre', '') ?? undefined;
};
