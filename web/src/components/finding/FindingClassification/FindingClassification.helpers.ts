import type { Finding } from '@scan/shared';
import { CONFIDENCE_LABEL, TOOL_META } from '../../../theme/display.consts';
import { FACT_SEPARATOR } from './FindingClassification.consts';

/** "Semgrep · High confidence · CWE-89 · A03:2021 - Injection" on one line. */
export const classificationLine = (finding: Finding) =>
  [TOOL_META[finding.source].label, CONFIDENCE_LABEL[finding.confidence], ...finding.cwe, ...finding.owasp].join(FACT_SEPARATOR);
