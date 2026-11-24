import { describe, expect, it } from 'vitest';
import { FINDING_TYPE, PRIORITY, RISK_GRADE, SEVERITY } from '@scan/shared';
import { analyze } from '../src/common/analysis/analyze';
import { buildCodeFindings, maskSecrets } from '../src/common/analysis/codeFindings';
import { buildDependencyFindings } from '../src/common/analysis/dependencyFindings';
import { buildAdvisory, buildCodeMatch, buildCodeScan, buildDependencyScan, buildPackage } from './support/fakeScanOutputs';

const REPO = { owner: 'acme', name: 'shop', url: 'https://github.com/acme/shop' };

describe('code findings', () => {
  it('merges different rules flagging the same weakness into one finding with unique locations', () => {
    const findings = buildCodeFindings([
      buildCodeMatch({ line: 28, ruleId: 'xss.direct-response-write' }),
      buildCodeMatch({ line: 32, ruleId: 'xss.raw-html-format' }),
      buildCodeMatch({ line: 32, ruleId: 'xss.direct-response-write' }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ occurrences: 2, title: 'Cross-Site-Scripting (XSS)', cwe: ['CWE-79'] });
    expect(findings[0]?.ruleIds).toHaveLength(2);
  });

  it('derives severity from the final risk score, not the scanner rating', () => {
    const [finding] = buildCodeFindings([
      buildCodeMatch({ semgrepSeverity: 'ERROR', impact: 'HIGH', likelihood: 'LOW', confidence: 'LOW' }),
    ]);
    expect(finding).toMatchObject({ riskScore: 77, severity: SEVERITY.HIGH });
    expect(finding?.severityReason).toContain('The scanner rated it critical');
  });

  it('lowers the priority of issues that only appear in test code', () => {
    const [finding] = buildCodeFindings([buildCodeMatch({ path: 'test/server.spec.js' })]);
    expect(finding?.riskFactors).toContain('Only in test, example or docs code (-30)');
    expect(finding?.priority).toBe(PRIORITY.MONITOR);
  });

  it('treats live-looking credentials as critical and always fix-now, with the value masked', () => {
    const [finding] = buildCodeFindings([
      buildCodeMatch({
        ruleId: 'generic.secrets.security.detected-stripe-api-key',
        message: 'Stripe API Key detected',
        technology: ['secrets', 'stripe'],
        cwe: ['CWE-798: Use of Hard-coded Credentials'],
        semgrepSeverity: 'ERROR',
        confidence: 'LOW',
        snippet: "const key = 'sk_live_51HxAbCdEfGhIjKlMnOp';",
      }),
    ]);
    expect(finding).toMatchObject({ type: FINDING_TYPE.SECRET, severity: SEVERITY.CRITICAL, priority: PRIORITY.FIX_NOW });
    expect(finding?.locations[0]?.snippet).toBe("const key = 'sk_l************';");
  });

  it('masks string literals without touching the rest of the line', () => {
    expect(maskSecrets('token = "abcdefghijkl" + id')).toBe('token = "abcd********" + id');
  });
});

describe('dependency findings', () => {
  it('keeps every advisory with its own severity reason and picks one fix version for all', () => {
    const [finding] = buildDependencyFindings([
      buildPackage({
        advisories: [
          buildAdvisory(),
          buildAdvisory({ id: 'GHSA-p6mc-m468-83gw', aliases: ['CVE-2020-8203'], fixedVersion: '4.17.19', cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:H' }),
        ],
      }),
    ]);
    expect(finding?.dependency?.fixedVersion).toBe('4.17.21');
    expect(finding?.dependency?.upgradeType).toBe('patch');
    expect(finding?.dependency?.advisories.map((advisory) => advisory.cveIds[0])).toEqual(['CVE-2020-8203', 'CVE-2021-23337']);
    expect(finding?.dependency?.advisories[0]?.severityReason).toMatch(/^HIGH \(CVSS 7\.4\)\. It can be exploited remotely/);
    expect(finding?.recommendedAction).toBe('Upgrade lodash from 4.17.15 to 4.17.21 or later.');
  });

  it('ranks dev-only indirect packages below production ones and explains how to fix them', () => {
    const findings = buildDependencyFindings([
      buildPackage(),
      buildPackage({ name: 'minimist', version: '0.0.8', isDirect: false, isDev: true, introducedVia: [['mocha', 'mkdirp', 'minimist']] }),
    ]);
    const devOnly = findings.find((finding) => finding.dependency?.packageName === 'minimist')!;
    const prod = findings.find((finding) => finding.dependency?.packageName === 'lodash')!;
    expect(devOnly.riskScore).toBeLessThan(prod.riskScore);
    expect(devOnly.recommendedAction).toContain('Upgrade mocha');
    expect(devOnly.recommendedAction).toContain('"overrides"');
  });

  it('reports when no fix exists', () => {
    const [finding] = buildDependencyFindings([buildPackage({ advisories: [buildAdvisory({ fixedVersion: undefined })] })]);
    expect(finding?.fixAvailable).toBe(false);
    expect(finding?.recommendedAction).toContain('No patched version');
  });
});

describe('analyze', () => {
  it('produces a graded, prioritized result with next actions', () => {
    const result = analyze({ repo: REPO, code: buildCodeScan(), dependencies: buildDependencyScan(), tools: [], warnings: [] });
    expect(result.grade).toBe(RISK_GRADE.D);
    expect(result.findings.map((finding) => finding.type)).toEqual([FINDING_TYPE.DEPENDENCY, FINDING_TYPE.CODE]);
    expect(result.nextActions[0]?.title).toBe('Upgrade lodash to 4.17.21');
    expect(result.stats).toMatchObject({ filesScanned: 3, dependenciesScanned: 274, rawFindings: 2 });
  });

  it('groups indirect dependency fixes under the direct package to upgrade', () => {
    const result = analyze({
      repo: REPO,
      dependencies: buildDependencyScan([
        buildPackage({ name: 'qs', version: '6.5.1', isDirect: false, introducedVia: [['express', 'qs']] }),
        buildPackage({ name: 'send', version: '0.16.0', isDirect: false, introducedVia: [['express', 'send']] }),
      ]),
      tools: [],
      warnings: [],
    });
    expect(result.nextActions).toHaveLength(1);
    expect(result.nextActions[0]).toMatchObject({ title: 'Upgrade express' });
    expect(result.nextActions[0]?.findingIds).toHaveLength(2);
  });

  it('names each vulnerable package once in the upgrade action, even when several versions are affected', () => {
    const result = analyze({
      repo: REPO,
      dependencies: buildDependencyScan([
        buildPackage({ name: 'minimist', version: '0.0.8', isDirect: false, introducedVia: [['forever', 'minimist']] }),
        buildPackage({ name: 'minimist', version: '1.2.0', isDirect: false, introducedVia: [['forever', 'optimist', 'minimist']] }),
      ]),
      tools: [],
      warnings: [],
    });
    expect(result.nextActions[0]?.description).toContain('its vulnerable dependencies (minimist)');
    expect(result.nextActions[0]?.description).toContain('Upgrade forever to a release that pulls in the fixed versions');
  });

  it('lists an action for every urgent finding, with no cap', () => {
    const urgentCount = 9;
    const result = analyze({
      repo: REPO,
      dependencies: buildDependencyScan(
        Array.from({ length: urgentCount }, (_, index) => buildPackage({ name: `pkg-${index}` })),
      ),
      tools: [],
      warnings: [],
    });
    expect(result.findings.every((finding) => finding.priority !== PRIORITY.MONITOR)).toBe(true);
    expect(result.nextActions).toHaveLength(urgentCount);
  });

  it('grades a clean repository A', () => {
    expect(analyze({ repo: REPO, tools: [], warnings: [], code: buildCodeScan([]) }).grade).toBe(RISK_GRADE.A);
  });
});
