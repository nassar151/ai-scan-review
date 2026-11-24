import { SCANNER_TOOL, TOOL_RUN_STATUS } from '@scan/shared';
import type { CodeMatch, CodeScanOutput, DependencyScanOutput, RawAdvisory, VulnerablePackage } from '../../src/common/analysis/analysis.types';

export const buildCodeMatch = (overrides: Partial<CodeMatch> = {}): CodeMatch => ({
  ruleId: 'javascript.express.security.injection.raw-html-format.raw-html-format',
  path: 'src/server.js',
  line: 32,
  endLine: 32,
  message: 'User data flows into a manually-constructed HTML string.',
  semgrepSeverity: 'WARNING',
  confidence: 'MEDIUM',
  likelihood: 'HIGH',
  impact: 'MEDIUM',
  cwe: ["CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')"],
  owasp: ['A03:2021 - Injection'],
  references: [],
  vulnerabilityClass: ['Cross-Site-Scripting (XSS)'],
  technology: ['express'],
  snippet: "res.send('<h1>Hello ' + req.query.name + '</h1>');",
  ...overrides,
});

export const buildAdvisory = (overrides: Partial<RawAdvisory> = {}): RawAdvisory => ({
  id: 'GHSA-35jh-r3h4-6jhm',
  aliases: ['CVE-2021-23337'],
  summary: 'Command Injection in lodash',
  details: 'lodash versions prior to 4.17.21 are vulnerable to Command Injection via the template function.',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H',
  databaseSeverity: 'HIGH',
  fixedVersion: '4.17.21',
  cwe: ['CWE-77'],
  references: [],
  ...overrides,
});

export const buildPackage = (overrides: Partial<VulnerablePackage> = {}): VulnerablePackage => ({
  ecosystem: 'npm',
  name: 'lodash',
  version: '4.17.15',
  lockfile: 'package-lock.json',
  isDirect: true,
  isDev: false,
  introducedVia: [['lodash']],
  advisories: [buildAdvisory()],
  ...overrides,
});

export const buildCodeScan = (matches: CodeMatch[] = [buildCodeMatch()]): CodeScanOutput => ({
  matches,
  filesScanned: 3,
  tool: { tool: SCANNER_TOOL.SEMGREP, status: TOOL_RUN_STATUS.SUCCEEDED, rawFindingCount: matches.length },
});

export const buildDependencyScan = (packages: VulnerablePackage[] = [buildPackage()]): DependencyScanOutput => ({
  packages,
  dependenciesScanned: 274,
  directDependencies: 5,
  tool: { tool: SCANNER_TOOL.OSV_SCANNER, status: TOOL_RUN_STATUS.SUCCEEDED },
});
