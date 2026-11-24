/** Subset of `semgrep scan --json` output that the analysis uses. */
export interface SemgrepPosition {
  line: number;
  col: number;
}

export interface SemgrepMetadata {
  cwe?: string[] | string;
  owasp?: string[] | string;
  confidence?: string;
  likelihood?: string;
  impact?: string;
  references?: string[] | string;
  vulnerability_class?: string[];
  technology?: string[];
  subcategory?: string[];
  source?: string;
}

export interface SemgrepResult {
  check_id: string;
  path: string;
  start: SemgrepPosition;
  end: SemgrepPosition;
  extra: {
    message: string;
    severity: string;
    metadata?: SemgrepMetadata;
    fix?: string;
  };
}

export interface SemgrepOutput {
  version?: string;
  results: SemgrepResult[];
  errors: Array<{ message?: string; level?: string }>;
  paths?: { scanned?: string[] };
}
