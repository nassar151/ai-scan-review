import {
  EFFORT,
  PRIORITY,
  PRIORITY_ORDER,
  RISK_GRADE,
  RISK_SCORE_MAX,
  SEVERITY,
  SEVERITY_ORDER,
  type Effort,
  type Finding,
  type Priority,
  type RiskGrade,
  type Severity,
} from '@scan/shared';
import { GRADE_FIX_SOON_THRESHOLD_FOR_C, PRIORITY_THRESHOLDS, SEVERITY_THRESHOLDS } from './analysis.consts';

export interface RiskFactor {
  label: string;
  points: number;
}

export const formatPoints = (points: number) => (points > 0 ? `+${points}` : `${points}`);

/** Applies context factors to a base score; returns the clamped score and human-readable factor labels. */
export const scoreWithFactors = (base: number, factors: RiskFactor[]) => {
  const raw = factors.reduce((total, factor) => total + factor.points, base);
  return {
    riskScore: Math.round(Math.max(0, Math.min(RISK_SCORE_MAX, raw))),
    riskFactors: factors.map((factor) => (factor.points === 0 ? factor.label : `${factor.label} (${formatPoints(factor.points)})`)),
  };
};

export const priorityFromScore = (score: number): Priority =>
  PRIORITY_THRESHOLDS.find(([threshold]) => score >= threshold)?.[1] ?? PRIORITY.MONITOR;

export const severityFromRiskScore = (score: number): Severity =>
  SEVERITY_THRESHOLDS.find(([threshold]) => score >= threshold)?.[1] ?? SEVERITY.INFO;

/** Explains a severity that moved away from the scanner's rating because context factors moved the risk score. */
export const withScoreSeverityNote = (reason: string, scannerSeverity: Severity, severity: Severity, riskScore: number) =>
  scannerSeverity === severity
    ? reason
    : `${reason} The scanner rated it ${scannerSeverity}; after the risk factors the score is ${riskScore}, so the severity is ${severity}.`;

export const effortFromOccurrences = (occurrences: number, smallMax: number, mediumMax: number): Effort => {
  if (occurrences <= smallMax) return EFFORT.SMALL;
  return occurrences <= mediumMax ? EFFORT.MEDIUM : EFFORT.LARGE;
};

export const severityRank = (severity: Severity) => SEVERITY_ORDER.indexOf(severity);
export const priorityRank = (priority: Priority) => PRIORITY_ORDER.indexOf(priority);

export const highestSeverity = (severities: Severity[]): Severity =>
  severities.reduce<Severity>(
    (highest, severity) => (severityRank(severity) < severityRank(highest) ? severity : highest),
    SEVERITY.INFO,
  );

export const highestPriority = (priorities: Priority[]): Priority =>
  priorities.reduce<Priority>(
    (highest, priority) => (priorityRank(priority) < priorityRank(highest) ? priority : highest),
    PRIORITY.MONITOR,
  );

/** Most urgent first, then highest risk score. */
export const compareFindings = (a: Finding, b: Finding) =>
  priorityRank(a.priority) - priorityRank(b.priority) || b.riskScore - a.riskScore;

/**
 * F: something critical must be fixed now. D: something must be fixed now.
 * C: several issues to schedule. B: a few issues to schedule. A: only low-risk items to monitor.
 */
export const gradeFor = (findings: Finding[]): RiskGrade => {
  const fixNow = findings.filter((finding) => finding.priority === PRIORITY.FIX_NOW);
  const fixSoon = findings.filter((finding) => finding.priority === PRIORITY.FIX_SOON);
  if (fixNow.some((finding) => finding.severity === SEVERITY.CRITICAL)) return RISK_GRADE.F;
  if (fixNow.length > 0) return RISK_GRADE.D;
  if (fixSoon.length >= GRADE_FIX_SOON_THRESHOLD_FOR_C) return RISK_GRADE.C;
  return fixSoon.length > 0 ? RISK_GRADE.B : RISK_GRADE.A;
};
