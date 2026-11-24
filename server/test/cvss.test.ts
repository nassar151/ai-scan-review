import { describe, expect, it } from 'vitest';
import { SEVERITY } from '@scan/shared';
import { cvss3BaseScore, explainCvssVector, isRemoteUnauthenticated, severityFromScore } from '../src/common/analysis/cvss';

describe('cvss3BaseScore', () => {
  it.each([
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 9.8],
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H', 7.5],
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', 6.1],
    ['CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H', 7.2],
    ['CVSS:3.0/AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:N', 0],
  ])('scores %s as %s', (vector, expected) => {
    expect(cvss3BaseScore(vector)).toBe(expected);
  });

  it('returns undefined for CVSS v4 and malformed vectors', () => {
    expect(cvss3BaseScore('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N')).toBeUndefined();
    expect(cvss3BaseScore('not a vector')).toBeUndefined();
  });
});

describe('severityFromScore', () => {
  it.each([
    [9.8, SEVERITY.CRITICAL],
    [7, SEVERITY.HIGH],
    [6.9, SEVERITY.MEDIUM],
    [0.1, SEVERITY.LOW],
    [0, SEVERITY.INFO],
  ])('maps %s to %s', (score, severity) => {
    expect(severityFromScore(score)).toBe(severity);
  });
});

describe('explainCvssVector', () => {
  it('describes how the vulnerability is exploited and what it affects', () => {
    expect(explainCvssVector('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBe(
      'It can be exploited remotely over the network, with no special conditions, without any login, and without any user interaction, ' +
        'with high impact on confidentiality (data exposure), integrity (data tampering) and availability (denial of service).',
    );
  });

  it('understands CVSS v4 impact metrics', () => {
    expect(explainCvssVector('CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N')).toContain(
      'limited impact on confidentiality',
    );
  });

  it('flags remote, unauthenticated vectors', () => {
    expect(isRemoteUnauthenticated('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBe(true);
    expect(isRemoteUnauthenticated('CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBe(false);
  });
});
