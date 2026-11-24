import { SEVERITY, type Severity } from '@scan/shared';

/** CVSS v3.1 base metric weights (FIRST specification, section 7.4). */
const WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  PR_UNCHANGED: { N: 0.85, L: 0.62, H: 0.27 },
  PR_CHANGED: { N: 0.85, L: 0.68, H: 0.5 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
} as const;

const MAX_SCORE = 10;
const SCOPE_CHANGED_FACTOR = 1.08;
const SEVERITY_THRESHOLDS: Array<[number, Severity]> = [
  [9, SEVERITY.CRITICAL],
  [7, SEVERITY.HIGH],
  [4, SEVERITY.MEDIUM],
  [0.1, SEVERITY.LOW],
];

const ATTACK_VECTOR_TEXT: Record<string, string> = {
  N: 'can be exploited remotely over the network',
  A: 'requires access to the same local network',
  L: 'requires local access to the machine',
  P: 'requires physical access',
};
const COMPLEXITY_TEXT: Record<string, string> = {
  L: 'with no special conditions',
  H: 'only under specific conditions that are hard to arrange',
};
const PRIVILEGES_TEXT: Record<string, string> = {
  N: 'without any login',
  L: 'by any logged-in user',
  H: 'only by an admin-level user',
};
const INTERACTION_TEXT: Record<string, string> = {
  N: 'and without any user interaction',
  R: 'but needs a user to take an action (such as opening a link)',
  P: 'but needs a user to take an action (such as opening a link)',
  A: 'but needs a user to actively take part',
};
const IMPACT_TEXT = {
  C: 'confidentiality (data exposure)',
  I: 'integrity (data tampering)',
  A: 'availability (denial of service)',
} as const;

export type CvssMetrics = Record<string, string>;

export const parseCvssVector = (vector: string): { version: string; metrics: CvssMetrics } | undefined => {
  const [prefix, ...parts] = vector.split('/');
  const version = prefix?.match(/^CVSS:(\d\.\d)$/)?.[1];
  if (!version) return undefined;
  const metrics = Object.fromEntries(parts.map((part) => part.split(':') as [string, string]));
  return { version, metrics };
};

/** CVSS v3.x "round up to one decimal" as defined in the v3.1 spec appendix A. */
const roundUp = (value: number) => {
  const scaled = Math.round(value * 100_000);
  return scaled % 10_000 === 0 ? scaled / 100_000 : (Math.floor(scaled / 10_000) + 1) / 10;
};

const weight = <T extends Record<string, number>>(table: T, key: string | undefined) =>
  key !== undefined && key in table ? table[key as keyof T] : undefined;

/** Base score for CVSS v3.0/v3.1 vectors. Returns undefined for v4 or malformed vectors. */
export const cvss3BaseScore = (vector: string): number | undefined => {
  const parsed = parseCvssVector(vector);
  if (!parsed?.version.startsWith('3')) return undefined;
  const { AV, AC, PR, UI, S, C, I, A } = parsed.metrics;
  const scopeChanged = S === 'C';

  const av = weight(WEIGHTS.AV, AV);
  const ac = weight(WEIGHTS.AC, AC);
  const pr = weight(scopeChanged ? WEIGHTS.PR_CHANGED : WEIGHTS.PR_UNCHANGED, PR);
  const ui = weight(WEIGHTS.UI, UI);
  const c = weight(WEIGHTS.CIA, C);
  const i = weight(WEIGHTS.CIA, I);
  const a = weight(WEIGHTS.CIA, A);
  if ([av, ac, pr, ui, c, i, a].some((value) => value === undefined)) return undefined;

  const iss = 1 - (1 - c!) * (1 - i!) * (1 - a!);
  const impact = scopeChanged ? 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15 : 6.42 * iss;
  if (impact <= 0) return 0;

  const exploitability = 8.22 * av! * ac! * pr! * ui!;
  const total = scopeChanged ? SCOPE_CHANGED_FACTOR * (impact + exploitability) : impact + exploitability;
  return roundUp(Math.min(total, MAX_SCORE));
};

export const severityFromScore = (score: number): Severity =>
  SEVERITY_THRESHOLDS.find(([threshold]) => score >= threshold)?.[1] ?? SEVERITY.INFO;

const listJoin = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** Plain-English reading of the vector: how it is exploited and what it affects. */
export const explainCvssVector = (vector: string): string | undefined => {
  const parsed = parseCvssVector(vector);
  if (!parsed) return undefined;
  const { metrics } = parsed;

  const how = [
    ATTACK_VECTOR_TEXT[metrics.AV ?? ''],
    COMPLEXITY_TEXT[metrics.AC ?? ''],
    PRIVILEGES_TEXT[metrics.PR ?? ''],
    INTERACTION_TEXT[metrics.UI ?? ''],
  ].filter(Boolean);

  const impactKey = (key: keyof typeof IMPACT_TEXT) => metrics[key] ?? metrics[`V${key}`];
  const keys = Object.keys(IMPACT_TEXT) as Array<keyof typeof IMPACT_TEXT>;
  const high = keys.filter((key) => impactKey(key) === 'H').map((key) => IMPACT_TEXT[key]);
  const low = keys.filter((key) => impactKey(key) === 'L').map((key) => IMPACT_TEXT[key]);

  const impact = [
    high.length > 0 ? `high impact on ${listJoin(high)}` : '',
    low.length > 0 ? `limited impact on ${listJoin(low)}` : '',
  ].filter(Boolean);

  const sentence = how.length > 0 ? `It ${how.join(', ')}` : '';
  return [sentence, impact.length > 0 ? `with ${impact.join(' and ')}` : ''].filter(Boolean).join(', ') + '.';
};

export const isRemoteUnauthenticated = (vector: string | undefined) => {
  const metrics = vector ? parseCvssVector(vector)?.metrics : undefined;
  return metrics?.AV === 'N' && metrics.PR === 'N';
};
