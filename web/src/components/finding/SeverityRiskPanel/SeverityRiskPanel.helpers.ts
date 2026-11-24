import type { Finding, FindingInvestigation } from '@scan/shared';

export const ratingChanged = (finding: Finding, investigation: FindingInvestigation) =>
  investigation.originalSeverity !== finding.severity ||
  investigation.originalRiskScore !== finding.riskScore ||
  investigation.originalPriority !== finding.priority;
