/** Subset of `osv-scanner scan source --format json` output that the analysis uses. */
export interface OsvRangeEvent {
  introduced?: string;
  fixed?: string;
  last_affected?: string;
  limit?: string;
}

export interface OsvAffected {
  package?: { name: string; ecosystem: string };
  ranges?: Array<{ type: string; events: OsvRangeEvent[] }>;
  versions?: string[];
}

export interface OsvVulnerability {
  id: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  published?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: OsvAffected[];
  references?: Array<{ type: string; url: string }>;
  database_specific?: { severity?: string; cwe_ids?: string[] };
}

export interface OsvPackageResult {
  package: { name: string; version: string; ecosystem: string };
  dependency_groups?: string[];
  groups?: Array<{ ids: string[]; aliases?: string[]; max_severity?: string }>;
  vulnerabilities?: OsvVulnerability[];
}

export interface OsvOutput {
  results?: Array<{
    source: { path: string; type: string };
    packages?: OsvPackageResult[];
  }>;
}
