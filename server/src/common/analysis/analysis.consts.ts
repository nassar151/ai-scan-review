import { PRIORITY, SEVERITY, type Priority, type Severity } from '@scan/shared';

/** Starting risk score per severity before context adjustments. */
export const BASE_SCORE: Record<Severity, number> = {
  [SEVERITY.CRITICAL]: 92,
  [SEVERITY.HIGH]: 78,
  [SEVERITY.MEDIUM]: 55,
  [SEVERITY.LOW]: 30,
  [SEVERITY.INFO]: 12,
};

export const CVSS_TO_SCORE_FACTOR = 10;

/** Context adjustments (points on the 0-100 scale). Shown to the user as risk factors. */
export const ADJUSTMENT = {
  DEV_ONLY: -35,
  TEST_CODE_ONLY: -30,
  DIRECT_DEPENDENCY: 5,
  INDIRECT_DEPENDENCY: -5,
  REMOTE_NO_AUTH: 5,
  MANY_ADVISORIES: 5,
  WIDESPREAD: 5,
  HIGH_LIKELIHOOD: 5,
  LOW_LIKELIHOOD: -5,
  HIGH_CONFIDENCE: 5,
  LOW_CONFIDENCE: -10,
  LIVE_CREDENTIAL: 5,
} as const;

export const MANY_ADVISORIES_THRESHOLD = 3;
export const WIDESPREAD_THRESHOLD = 5;
export const MAX_LOCATIONS_PER_FINDING = 25;
export const SMALL_EFFORT_MAX_OCCURRENCES = 3;
export const MEDIUM_EFFORT_MAX_OCCURRENCES = 10;

/** Score at or above which a finding lands in the bucket. */
export const PRIORITY_THRESHOLDS: Array<[number, Priority]> = [
  [70, PRIORITY.FIX_NOW],
  [45, PRIORITY.FIX_SOON],
  [0, PRIORITY.MONITOR],
];

/** Final severity follows the final risk score, using the CVSS bands on the 0-100 scale (CVSS 9.0+ = critical). */
export const SEVERITY_THRESHOLDS: Array<[number, Severity]> = [
  [90, SEVERITY.CRITICAL],
  [70, SEVERITY.HIGH],
  [40, SEVERITY.MEDIUM],
  [20, SEVERITY.LOW],
  [0, SEVERITY.INFO],
];

export const GRADE_FIX_SOON_THRESHOLD_FOR_C = 3;
/** Only caps the fallback list of "monitor" actions; fix-now and fix-soon actions are never cut. */
export const MAX_MONITOR_ACTIONS = 7;
/** Ranking bonus per extra finding an action resolves, so one upgrade fixing many issues ranks higher. */
export const ACTION_BREADTH_BONUS = 3;
/** Indirect packages named in one upgrade action before collapsing into "+N more". */
export const MAX_LISTED_PACKAGES = 5;

/** Semgrep vulnerability classes too broad to be a useful title on their own. */
export const GENERIC_VULNERABILITY_CLASSES = new Set([
  'Cryptographic Issues',
  'Improper Validation',
  'Improper Authentication',
  'Mishandled Sensitive Information',
  'Other',
]);
export const MAX_TITLE_LENGTH = 80;
/** Sentences in a rule message that tell the developer what to do. */
export const ADVICE_SENTENCE_PATTERN = /^(instead|use |do not|don't|avoid|consider|ensure|make sure|prefer|replace|validate|sanitize|escape)/i;

export const TEST_PATH_PATTERN =
  /(^|\/)(tests?|__tests__|spec|e2e|fixtures?|examples?|docs?|demo|samples?|mocks?|__mocks__|stories)(\/|$)|\.(test|spec|stories)\.[cm]?[jt]sx?$/i;

export const LIVE_CREDENTIAL_PATTERN =
  /(sk_live_|rk_live_|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[abpr]-|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{30,})/;

export const SECRET_CWE = 'CWE-798';
export const SECRET_TECHNOLOGY = 'secrets';

/** Concrete, well-known remediations per weakness, used as the recommended action for code findings. */
export const CWE_REMEDIATION: Record<string, string> = {
  'CWE-79': 'Escape user input before writing it into HTML (or use a template engine that auto-escapes); never send raw request data in a response body.',
  'CWE-89': 'Use parameterized queries (e.g. db.query("... WHERE id = $1", [id])) instead of building SQL strings from user input.',
  'CWE-78': 'Avoid passing user input to a shell. Use execFile/spawn with an argument array and validate input against an allow-list.',
  'CWE-22': 'Resolve the final path and verify it stays inside the intended base directory; reject names containing "..".',
  'CWE-94': 'Remove eval/new Function on user input. Parse data with JSON.parse or a dedicated safe parser.',
  'CWE-95': 'Remove eval/new Function on user input. Parse data with JSON.parse or a dedicated safe parser.',
  'CWE-798': 'Revoke and rotate the credential, remove it from the code, and load it from an environment variable or secret manager.',
  'CWE-352': 'Add CSRF protection (anti-CSRF tokens) and set cookies with SameSite=Lax or Strict.',
  'CWE-347': 'Verify JWTs with an explicit algorithm allow-list (e.g. algorithms: ["HS256"]) and never accept "none".',
  'CWE-1321': 'Reject keys like __proto__ and constructor when merging user objects, or use Object.create(null) maps.',
  'CWE-601': 'Only redirect to relative paths or an allow-list of trusted domains.',
  'CWE-918': 'Validate outbound URLs against an allow-list and block internal IP ranges.',
  'CWE-1333': 'Rewrite the regular expression to avoid nested quantifiers, or limit input length before matching.',
};
