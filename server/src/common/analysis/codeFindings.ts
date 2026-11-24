import { createHash } from 'node:crypto';
import {
  CONFIDENCE,
  EFFORT,
  FINDING_TYPE,
  PRIORITY,
  SCANNER_TOOL,
  SEVERITY,
  type CodeLocation,
  type Confidence,
  type Finding,
  type Severity,
} from '@scan/shared';
import {
  ADJUSTMENT,
  ADVICE_SENTENCE_PATTERN,
  BASE_SCORE,
  CWE_REMEDIATION,
  GENERIC_VULNERABILITY_CLASSES,
  LIVE_CREDENTIAL_PATTERN,
  MAX_LOCATIONS_PER_FINDING,
  MAX_TITLE_LENGTH,
  MEDIUM_EFFORT_MAX_OCCURRENCES,
  SECRET_CWE,
  SECRET_TECHNOLOGY,
  SMALL_EFFORT_MAX_OCCURRENCES,
  TEST_PATH_PATTERN,
  WIDESPREAD_THRESHOLD,
} from './analysis.consts';
import type { CodeMatch, RuleLevel, SemgrepSeverity } from './analysis.types';
import {
  effortFromOccurrences,
  highestSeverity,
  priorityFromScore,
  scoreWithFactors,
  severityFromRiskScore,
  withScoreSeverityNote,
  type RiskFactor,
} from './scoring';

const SEMGREP_TO_SEVERITY: Record<SemgrepSeverity, Severity> = {
  ERROR: SEVERITY.HIGH,
  WARNING: SEVERITY.MEDIUM,
  INFO: SEVERITY.LOW,
};
const CONFIDENCE_MAP: Record<RuleLevel, Confidence> = {
  HIGH: CONFIDENCE.HIGH,
  MEDIUM: CONFIDENCE.MEDIUM,
  LOW: CONFIDENCE.LOW,
};
const CWE_ID_PATTERN = /CWE-\d+/;
const SECRET_VALUE_PATTERN = /(['"`])([^'"`\s]{8,})\1/g;
const VISIBLE_SECRET_CHARS = 4;
const SHORT_MESSAGE_LENGTH = 70;
const ID_HASH_LENGTH = 12;

const cweId = (cwe: string) => cwe.match(CWE_ID_PATTERN)?.[0];

export const isSecretMatch = (match: CodeMatch) =>
  match.technology.includes(SECRET_TECHNOLOGY) || match.cwe.some((cwe) => cweId(cwe) === SECRET_CWE);

const isTestPath = (file: string) => TEST_PATH_PATTERN.test(file);

/** Keeps the first characters of string literals so the user recognizes the value without exposing it. */
export const maskSecrets = (snippet: string | undefined) =>
  snippet?.replace(SECRET_VALUE_PATTERN, (_whole, quote: string, value: string) =>
    `${quote}${value.slice(0, VISIBLE_SECRET_CHARS)}${'*'.repeat(Math.min(value.length - VISIBLE_SECRET_CHARS, 12))}${quote}`,
  );

/** Severity from the rule, nudged by Semgrep's own impact rating. */
const matchSeverity = (match: CodeMatch, isSecret: boolean): Severity => {
  if (isSecret) {
    return LIVE_CREDENTIAL_PATTERN.test(match.snippet ?? '') ? SEVERITY.CRITICAL : SEVERITY.HIGH;
  }
  const base = SEMGREP_TO_SEVERITY[match.semgrepSeverity];
  if (base === SEVERITY.HIGH && match.impact === 'HIGH') return SEVERITY.CRITICAL;
  if (match.impact === 'LOW' && base === SEVERITY.MEDIUM) return SEVERITY.LOW;
  return base;
};

const describeLevels = (match: CodeMatch) =>
  [
    match.impact && `impact ${match.impact.toLowerCase()}`,
    match.likelihood && `likelihood ${match.likelihood.toLowerCase()}`,
    match.confidence && `rule confidence ${match.confidence.toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(', ');

const severityReasonFor = (severity: Severity, match: CodeMatch, isSecret: boolean, cwes: string[]) => {
  const label = severity.toUpperCase();
  if (isSecret) {
    return severity === SEVERITY.CRITICAL
      ? `${label}: the value matches the format of a live production credential, which anyone with read access to the code can use immediately.`
      : `${label}: a hard-coded credential gives anyone who can read the repository the same access as the application.`;
  }
  const levels = describeLevels(match);
  const weakness = cwes[0] ? ` It maps to ${cwes[0]}.` : '';
  return `${label}: Semgrep rates this rule ${match.semgrepSeverity}${levels ? ` (${levels})` : ''}.${weakness}`;
};

const sentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const firstSentence = (text: string) => (sentences(text)[0] ?? text).replace(/\.$/, '');

const titleFor = (match: CodeMatch, isSecret: boolean) => {
  const message = firstSentence(match.message);
  if (isSecret) {
    return message.length <= SHORT_MESSAGE_LENGTH ? `Hard-coded secret: ${message}` : 'Hard-coded credential in source code';
  }
  const vulnerabilityClass = match.vulnerabilityClass[0];
  if (vulnerabilityClass && !GENERIC_VULNERABILITY_CLASSES.has(vulnerabilityClass)) return vulnerabilityClass;
  if (message.length <= MAX_TITLE_LENGTH) return message;
  return vulnerabilityClass ?? match.cwe[0]?.split(':')[1]?.trim() ?? match.ruleId.split('.').at(-1)!;
};

/** The rule's own advice sentences ("Instead, use HS256…"), used when no CWE-specific remediation exists. */
const adviceFromMessage = (message: string) =>
  sentences(message)
    .filter((sentence) => ADVICE_SENTENCE_PATTERN.test(sentence))
    .join(' ');

const groupKey = (match: CodeMatch, isSecret: boolean) =>
  isSecret ? `secret:${match.ruleId}` : `code:${match.cwe.map(cweId).find(Boolean) ?? match.ruleId}`;

const findingId = (key: string) => createHash('sha1').update(key).digest('hex').slice(0, ID_HASH_LENGTH);

const uniqueLocations = (matches: CodeMatch[], isSecret: boolean): CodeLocation[] => {
  const seen = new Map<string, CodeLocation>();
  matches.forEach((match) => {
    const key = `${match.path}:${match.line}`;
    if (!seen.has(key)) {
      seen.set(key, {
        path: match.path,
        line: match.line,
        endLine: match.endLine,
        snippet: isSecret ? maskSecrets(match.snippet) : match.snippet,
      });
    }
  });
  return [...seen.values()];
};

const riskFactorsFor = (lead: CodeMatch, locations: CodeLocation[], isSecret: boolean): RiskFactor[] => {
  const factors: RiskFactor[] = [];
  const testOnly = locations.every((location) => isTestPath(location.path));
  factors.push(testOnly
    ? { label: 'Only in test, example or docs code', points: ADJUSTMENT.TEST_CODE_ONLY }
    : { label: 'In application code', points: 0 });

  if (isSecret && LIVE_CREDENTIAL_PATTERN.test(lead.snippet ?? '')) {
    factors.push({ label: 'Looks like a live credential', points: ADJUSTMENT.LIVE_CREDENTIAL });
  }
  if (!isSecret && lead.likelihood === 'HIGH') factors.push({ label: 'High exploit likelihood', points: ADJUSTMENT.HIGH_LIKELIHOOD });
  if (!isSecret && lead.likelihood === 'LOW') factors.push({ label: 'Low exploit likelihood', points: ADJUSTMENT.LOW_LIKELIHOOD });
  if (lead.confidence === 'HIGH') factors.push({ label: 'High-confidence rule', points: ADJUSTMENT.HIGH_CONFIDENCE });
  if (lead.confidence === 'LOW' && !isSecret) {
    factors.push({ label: 'Low-confidence rule, may be a false positive', points: ADJUSTMENT.LOW_CONFIDENCE });
  }
  if (locations.length >= WIDESPREAD_THRESHOLD) {
    factors.push({ label: `Appears in ${locations.length} places`, points: ADJUSTMENT.WIDESPREAD });
  }
  return factors;
};

const fallbackAction = (cwes: string[], lead: CodeMatch) =>
  cwes.map((cwe) => CWE_REMEDIATION[cwe]).find(Boolean) ||
  (lead.fix ? `Apply the suggested fix: ${lead.fix}` : '') ||
  adviceFromMessage(lead.message) ||
  `Review the flagged code and follow the rule guidance${lead.ruleUrl ? ` (${lead.ruleUrl})` : ''}.`;

const buildFinding = (key: string, matches: CodeMatch[]): Finding => {
  const isSecret = key.startsWith('secret:');
  const severities = matches.map((match) => matchSeverity(match, isSecret));
  const scannerSeverity = highestSeverity(severities);
  const lead = matches[severities.indexOf(scannerSeverity)] ?? matches[0]!;
  const cwes = [...new Set(matches.flatMap((match) => match.cwe.map(cweId)).filter((id): id is string => Boolean(id)))];
  const locations = uniqueLocations(matches, isSecret);
  const { riskScore, riskFactors } = scoreWithFactors(BASE_SCORE[scannerSeverity], riskFactorsFor(lead, locations, isSecret));
  const severity = severityFromRiskScore(riskScore);
  const testOnly = locations.every((location) => isTestPath(location.path));
  const priority = isSecret && !testOnly ? PRIORITY.FIX_NOW : priorityFromScore(riskScore);
  const action = fallbackAction(cwes, lead);

  return {
    id: findingId(key),
    type: isSecret ? FINDING_TYPE.SECRET : FINDING_TYPE.CODE,
    title: titleFor(lead, isSecret),
    description: lead.message,
    severity,
    severityReason: withScoreSeverityNote(severityReasonFor(scannerSeverity, lead, isSecret, cwes), scannerSeverity, severity, riskScore),
    riskScore,
    priority,
    confidence: lead.confidence ? CONFIDENCE_MAP[lead.confidence] : CONFIDENCE.MEDIUM,
    whyItMatters: lead.message,
    recommendedAction: action,
    fixSteps: [
      action,
      locations.length > 1 ? `Apply the fix in all ${locations.length} locations listed under "Where".` : 'Apply the fix at the location shown under "Where".',
      'Re-run the scan to confirm the finding is resolved.',
    ],
    effort: isSecret ? EFFORT.SMALL : effortFromOccurrences(locations.length, SMALL_EFFORT_MAX_OCCURRENCES, MEDIUM_EFFORT_MAX_OCCURRENCES),
    fixAvailable: true,
    riskFactors,
    locations: locations.slice(0, MAX_LOCATIONS_PER_FINDING),
    occurrences: locations.length,
    cwe: cwes,
    owasp: [...new Set(matches.flatMap((match) => match.owasp))],
    references: [
      ...cwes.map((cwe) => ({ label: cwe, url: `https://cwe.mitre.org/data/definitions/${cwe.split('-')[1]}.html` })),
      ...[...new Set(matches.map((match) => match.ruleUrl).filter((url): url is string => Boolean(url)))].map((url) => ({
        label: 'Semgrep rule',
        url,
      })),
    ],
    source: SCANNER_TOOL.SEMGREP,
    ruleIds: [...new Set(matches.map((match) => match.ruleId))],
  };
};

/**
 * Groups raw matches into findings: code issues by weakness (CWE), so several rules flagging the same
 * line become one finding; secrets by rule, so each credential type is handled separately.
 */
export const buildCodeFindings = (matches: CodeMatch[]): Finding[] => {
  const groups = new Map<string, CodeMatch[]>();
  matches.forEach((match) => {
    const key = groupKey(match, isSecretMatch(match));
    groups.set(key, [...(groups.get(key) ?? []), match]);
  });
  return [...groups.entries()].map(([key, group]) => buildFinding(key, group));
};
