export const SCAN_STATUS = {
  QUEUED: 'queued',
  CLONING: 'cloning',
  SCANNING_CODE: 'scanning_code',
  SCANNING_DEPENDENCIES: 'scanning_dependencies',
  ANALYZING: 'analyzing',
  INVESTIGATING: 'investigating',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const TERMINAL_SCAN_STATUSES = [SCAN_STATUS.COMPLETED, SCAN_STATUS.FAILED] as const;

export const STAGE_STATE = {
  PENDING: 'pending',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

/** Ordered pipeline stages shown in the progress tracker. */
export const PIPELINE_STAGES = [
  { status: SCAN_STATUS.CLONING, label: 'Fetching repository' },
  { status: SCAN_STATUS.SCANNING_CODE, label: 'Scanning source code' },
  { status: SCAN_STATUS.SCANNING_DEPENDENCIES, label: 'Checking dependencies' },
  { status: SCAN_STATUS.ANALYZING, label: 'Analyzing risk' },
  { status: SCAN_STATUS.INVESTIGATING, label: 'AI investigation' },
] as const;

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

/** Highest first; used for sorting and counting. */
export const SEVERITY_ORDER = [
  SEVERITY.CRITICAL,
  SEVERITY.HIGH,
  SEVERITY.MEDIUM,
  SEVERITY.LOW,
  SEVERITY.INFO,
] as const;

export const PRIORITY = {
  FIX_NOW: 'fix_now',
  FIX_SOON: 'fix_soon',
  MONITOR: 'monitor',
} as const;

export const PRIORITY_ORDER = [PRIORITY.FIX_NOW, PRIORITY.FIX_SOON, PRIORITY.MONITOR] as const;

export const FINDING_TYPE = {
  CODE: 'code',
  DEPENDENCY: 'dependency',
  SECRET: 'secret',
} as const;

export const EFFORT = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export const CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const RISK_GRADE = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F',
} as const;

export const SCANNER_TOOL = {
  SEMGREP: 'semgrep',
  OSV_SCANNER: 'osv-scanner',
  AI_AGENT: 'ai-agent',
} as const;

/** The AI agent's verdict on whether vulnerable code can actually be reached in this repository. */
export const REACHABILITY = {
  REACHABLE: 'reachable',
  NOT_REACHABLE: 'not_reachable',
  UNKNOWN: 'unknown',
} as const;

/** Where untrusted data enters, the code it passes through, and the dangerous call it reaches. */
export const DATA_FLOW_STEP_KIND = {
  SOURCE: 'source',
  PROPAGATION: 'propagation',
  SINK: 'sink',
} as const;

export const TOOL_RUN_STATUS = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export const AI_STATUS = {
  COMPLETED: 'completed',
  /** No AI API key configured. */
  UNAVAILABLE: 'unavailable',
  FAILED: 'failed',
} as const;

export const SCAN_EVENT_TYPE = {
  SNAPSHOT: 'snapshot',
  UPDATE: 'update',
} as const;

export const RISK_SCORE_MAX = 100;
