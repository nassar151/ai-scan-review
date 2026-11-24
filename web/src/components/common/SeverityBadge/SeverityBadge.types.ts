import type { Severity } from '@scan/shared';

export interface SeverityBadgeProps {
  severity: Severity;
  /** CVSS score shown next to the label, e.g. "High 8.1". */
  score?: number;
}
