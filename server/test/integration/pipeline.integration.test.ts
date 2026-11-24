import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FINDING_TYPE, PRIORITY, RISK_GRADE, type ScanResult } from '@scan/shared';
import { analyze } from '../../src/common/analysis/analyze';
import { highestVersion } from '../../src/common/analysis/versions';
import { runOsvScanner } from '../../src/scan-service/scanners/osv/osv';
import { runSemgrep } from '../../src/scan-service/scanners/semgrep/semgrep';

const FIXTURE = path.resolve(import.meta.dirname, '../fixtures/vulnerable-app');
const REPO = { owner: 'fixture', name: 'vulnerable-app', url: 'https://github.com/fixture/vulnerable-app' };
const SCANNER_TIMEOUT_MS = 180_000;

const isInstalled = (binary: string) => {
  try {
    execFileSync(binary, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/** Runs the real scanners on an intentionally vulnerable app. Needs semgrep, osv-scanner and network access. */
describe.skipIf(!isInstalled('semgrep') || !isInstalled('osv-scanner'))('real scanners on the vulnerable fixture', () => {
  let workDir: string;
  let result: ScanResult;

  beforeAll(async () => {
    // Semgrep skips folders named test/ and fixtures/, so scan a copy outside the repository.
    workDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'ai-scan-fixture-')));
    await fs.cp(FIXTURE, workDir, { recursive: true });
    const [code, dependencies] = await Promise.all([
      runSemgrep(workDir),
      runOsvScanner(workDir, [path.join(workDir, 'package-lock.json')]),
    ]);
    result = analyze({ repo: REPO, code, dependencies, tools: [code.tool, dependencies.tool], warnings: [] });
  }, SCANNER_TIMEOUT_MS);

  afterAll(async () => {
    if (workDir) await fs.rm(workDir, { recursive: true, force: true });
  });

  it('finds code issues, the hardcoded secret and vulnerable dependencies', () => {
    expect(result.typeCounts[FINDING_TYPE.CODE]).toBeGreaterThan(0);
    expect(result.typeCounts[FINDING_TYPE.SECRET]).toBeGreaterThan(0);
    expect(result.typeCounts[FINDING_TYPE.DEPENDENCY]).toBeGreaterThan(0);
    expect(result.grade).toBe(RISK_GRADE.F);
  });

  it('groups raw results into fewer findings', () => {
    expect(result.findings.length).toBeLessThan(result.stats.rawFindings);
  });

  it('explains every CVE with severity reasoning and the fix version', () => {
    const lodash = result.findings.find((finding) => finding.dependency?.packageName === 'lodash');
    const fixes = lodash?.dependency?.advisories.map((advisory) => advisory.fixedVersion ?? '') ?? [];
    expect(lodash?.dependency?.isDirect).toBe(true);
    expect(lodash?.dependency?.fixedVersion).toBe(highestVersion(fixes));
    lodash?.dependency?.advisories.forEach((advisory) => {
      expect(advisory.severityReason.length).toBeGreaterThan(10);
      expect(advisory.url).toMatch(/^https:\/\//);
    });
    expect(lodash?.dependency?.advisories.some((advisory) => advisory.cveIds.length > 0)).toBe(true);
  });

  it('marks indirect dev-only dependencies as lower priority with their dependency chain', () => {
    const devOnly = result.findings.filter((finding) => finding.dependency?.isDev);
    expect(devOnly.length).toBeGreaterThan(0);
    devOnly.forEach((finding) => {
      expect(finding.priority).not.toBe(PRIORITY.FIX_NOW);
      expect(finding.dependency?.introducedVia[0]?.[0]).toBe('mocha');
    });
  });

  it('masks secret values in snippets', () => {
    const secret = result.findings.find((finding) => finding.type === FINDING_TYPE.SECRET && finding.title.includes('Mailgun'));
    expect(secret).toBeDefined();
    expect(secret?.locations[0]?.snippet).not.toContain('key-3ax6xnjp29jd');
    expect(secret?.priority).toBe(PRIORITY.FIX_NOW);
  });
});
