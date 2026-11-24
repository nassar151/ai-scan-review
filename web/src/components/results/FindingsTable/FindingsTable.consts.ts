/** Minimum widths keep the free-text columns readable when the table scrolls horizontally. */
export const FINDINGS_TABLE_COLUMNS = [
  { key: 'identifiers', header: 'CVE / CWE' },
  { key: 'finding', header: 'Finding', minWidth: 240 },
  { key: 'appearances', header: 'Appearances' },
  { key: 'type', header: 'Type' },
  { key: 'severity', header: 'Severity' },
  { key: 'priority', header: 'Priority' },
  { key: 'risk', header: 'Risk' },
  { key: 'fix', header: 'Fix' },
] as const;
