import { describe, expect, it } from 'vitest';
import { highestVersion, upgradeType } from '../src/common/analysis/versions';
import { findFixedVersion } from '../src/scan-service/scanners/osv/fixedVersion';

const ranges = (...events: Array<Record<string, string>>) => [
  { package: { name: 'lodash', ecosystem: 'npm' }, ranges: [{ type: 'SEMVER', events }] },
];

describe('findFixedVersion', () => {
  it('returns the fix of the range that contains the installed version', () => {
    const affected = [
      ...ranges({ introduced: '0' }, { fixed: '3.10.2' }),
      ...ranges({ introduced: '4.0.0' }, { fixed: '4.17.21' }),
    ];
    expect(findFixedVersion(affected, 'lodash', '3.5.0')).toBe('3.10.2');
    expect(findFixedVersion(affected, 'lodash', '4.17.15')).toBe('4.17.21');
  });

  it('returns undefined when no fix is published', () => {
    expect(findFixedVersion(ranges({ introduced: '0' }), 'lodash', '4.17.15')).toBeUndefined();
    expect(findFixedVersion(ranges({ introduced: '0' }, { last_affected: '4.17.20' }), 'lodash', '4.17.15')).toBeUndefined();
  });

  it('ignores ranges for other packages', () => {
    const affected = [{ package: { name: 'other', ecosystem: 'npm' }, ranges: [{ type: 'SEMVER', events: [{ introduced: '0' }, { fixed: '9.9.9' }] }] }];
    expect(findFixedVersion(affected, 'lodash', '1.0.0')).toBeUndefined();
  });
});

describe('version helpers', () => {
  it('picks the highest fix so one upgrade resolves every advisory', () => {
    expect(highestVersion(['4.17.19', '4.17.21', '4.17.12'])).toBe('4.17.21');
  });

  it('classifies the upgrade size', () => {
    expect(upgradeType('4.17.15', '4.17.21')).toBe('patch');
    expect(upgradeType('8.5.0', '9.0.0')).toBe('major');
  });
});
