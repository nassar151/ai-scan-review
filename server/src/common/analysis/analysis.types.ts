import type { CodeLocation, ToolRun } from '@scan/shared';

export type SemgrepSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type RuleLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** One Semgrep match, normalized. */
export interface CodeMatch {
  ruleId: string;
  path: string;
  line: number;
  endLine: number;
  message: string;
  semgrepSeverity: SemgrepSeverity;
  confidence?: RuleLevel;
  likelihood?: RuleLevel;
  impact?: RuleLevel;
  cwe: string[];
  owasp: string[];
  references: string[];
  vulnerabilityClass: string[];
  technology: string[];
  snippet?: string;
  fix?: string;
  ruleUrl?: string;
}

export interface CodeScanOutput {
  matches: CodeMatch[];
  filesScanned: number;
  tool: ToolRun;
}

/** One OSV advisory for one installed package version, normalized. */
export interface RawAdvisory {
  id: string;
  aliases: string[];
  summary: string;
  details: string;
  cvssVector?: string;
  /** GitHub's label: CRITICAL / HIGH / MODERATE / LOW. */
  databaseSeverity?: string;
  /** Group max score reported by osv-scanner. */
  groupScore?: number;
  fixedVersion?: string;
  cwe: string[];
  publishedAt?: string;
  references: string[];
}

export interface VulnerablePackage {
  ecosystem: string;
  name: string;
  version: string;
  /** Repo-relative lockfile path. */
  lockfile: string;
  /** undefined when the dependency file format does not say whether the package is direct. */
  isDirect?: boolean;
  isDev: boolean;
  introducedVia: string[][];
  advisories: RawAdvisory[];
  /** Line in the repo where the package is declared or locked. */
  location?: CodeLocation;
}

export interface DependencyScanOutput {
  packages: VulnerablePackage[];
  dependenciesScanned: number;
  directDependencies: number;
  tool: ToolRun;
}
