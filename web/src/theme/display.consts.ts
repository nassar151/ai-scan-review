import {
  AI_STATUS,
  CONFIDENCE,
  DATA_FLOW_STEP_KIND,
  EFFORT,
  FINDING_TYPE,
  PRIORITY,
  REACHABILITY,
  RISK_GRADE,
  SCANNER_TOOL,
  SCAN_STATUS,
  SEVERITY,
  STAGE_STATE,
  type AiStatus,
  type Confidence,
  type DataFlowStepKind,
  type Effort,
  type FindingType,
  type Priority,
  type Reachability,
  type RiskGrade,
  type ScanStatus,
  type ScannerTool,
  type Severity,
  type StageState,
} from '@scan/shared';
import type { BadgeVariant, TokenMeta } from './display.types';

/** Severity and grade colours are data-driven, so they are applied as inline accent styles. */
export const SEVERITY_META: Record<Severity, TokenMeta> = {
  [SEVERITY.CRITICAL]: { label: 'Critical', color: '#b91c1c' },
  [SEVERITY.HIGH]: { label: 'High', color: '#ea580c' },
  [SEVERITY.MEDIUM]: { label: 'Medium', color: '#b45309' },
  [SEVERITY.LOW]: { label: 'Low', color: '#0284c7' },
  [SEVERITY.INFO]: { label: 'Info', color: '#64748b' },
};

export const GRADE_META: Record<RiskGrade, TokenMeta> = {
  [RISK_GRADE.A]: { label: 'Low risk', color: '#15803d' },
  [RISK_GRADE.B]: { label: 'Some risk', color: '#0284c7' },
  [RISK_GRADE.C]: { label: 'Moderate risk', color: '#b45309' },
  [RISK_GRADE.D]: { label: 'High risk', color: '#ea580c' },
  [RISK_GRADE.F]: { label: 'Critical risk', color: '#b91c1c' },
};

export const BADGE_VARIANT_COLOR: Record<BadgeVariant, string> = {
  primary: '#1e3a8a',
  secondary: '#4b5563',
  success: '#15803d',
  warning: '#b45309',
  danger: '#b91c1c',
  error: '#b91c1c',
  info: '#0369a1',
  ghost: '#4b5563',
  outline: '#4b5563',
  neutral: '#4b5563',
};

/** Hex alpha suffixes for tinted accent backgrounds and borders. */
export const TINT_BACKGROUND_ALPHA = '1f';
export const TINT_BORDER_ALPHA = '66';
export const ACCENT_BAR_WIDTH = '4px';
export const BRAND_ACCENT = 'var(--bear-primary-600)';

export const PRIORITY_META: Record<Priority, { label: string; hint: string; variant: BadgeVariant }> = {
  [PRIORITY.FIX_NOW]: { label: 'Fix now', hint: 'Exploitable and reachable: fix before the next release', variant: 'primary' },
  [PRIORITY.FIX_SOON]: { label: 'Fix soon', hint: 'Real risk with lower exposure: plan it this sprint', variant: 'info' },
  [PRIORITY.MONITOR]: { label: 'Monitor', hint: 'Low exposure (dev-only, test code or low impact)', variant: 'secondary' },
};

export const FINDING_TYPE_META: Record<FindingType, { label: string; variant: BadgeVariant }> = {
  [FINDING_TYPE.CODE]: { label: 'Code', variant: 'info' },
  [FINDING_TYPE.DEPENDENCY]: { label: 'Dependency', variant: 'secondary' },
  [FINDING_TYPE.SECRET]: { label: 'Secret', variant: 'warning' },
};

export const EFFORT_LABEL: Record<Effort, string> = {
  [EFFORT.SMALL]: 'Quick fix',
  [EFFORT.MEDIUM]: 'Moderate effort',
  [EFFORT.LARGE]: 'Larger effort',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  [CONFIDENCE.HIGH]: 'High confidence',
  [CONFIDENCE.MEDIUM]: 'Medium confidence',
  [CONFIDENCE.LOW]: 'Low confidence',
};

export const STAGE_STATE_LABEL: Record<StageState, string> = {
  [STAGE_STATE.PENDING]: 'Waiting',
  [STAGE_STATE.RUNNING]: 'In progress',
  [STAGE_STATE.DONE]: 'Done',
  [STAGE_STATE.SKIPPED]: 'Skipped',
  [STAGE_STATE.FAILED]: 'Failed',
};

/** CI-style pipeline node: icon and colour per stage state. */
export const PIPELINE_STATE_META: Record<StageState, { icon: string; color: string }> = {
  [STAGE_STATE.PENDING]: { icon: '○', color: '#9ca3af' },
  [STAGE_STATE.RUNNING]: { icon: '●', color: '#2563eb' },
  [STAGE_STATE.DONE]: { icon: '✓', color: '#15803d' },
  [STAGE_STATE.SKIPPED]: { icon: '–', color: '#6b7280' },
  [STAGE_STATE.FAILED]: { icon: '✕', color: '#b91c1c' },
};

/** What each stage does, shown under the stage while it waits or runs. */
export const STAGE_EXPLANATION: Partial<Record<ScanStatus, string>> = {
  [SCAN_STATUS.CLONING]: 'Shallow clone of the default branch (no hooks, no scripts run)',
  [SCAN_STATUS.SCANNING_CODE]: 'Semgrep: injection, unsafe APIs, crypto mistakes and leaked secrets',
  [SCAN_STATUS.SCANNING_DEPENDENCIES]: 'OSV-Scanner: known CVEs in open-source packages (npm, Python, Go, Java, Ruby, Rust, PHP, .NET, …)',
  [SCAN_STATUS.ANALYZING]: 'Grouping, de-duplicating, risk scoring and prioritizing',
  [SCAN_STATUS.INVESTIGATING]: 'An AI agent reads the code behind every finding, checks reachability, traces the data flow from source to sink, then re-rates and explains it',
};

export const SCAN_STATUS_META: Record<ScanStatus, { label: string; variant: BadgeVariant }> = {
  [SCAN_STATUS.QUEUED]: { label: 'Queued', variant: 'secondary' },
  [SCAN_STATUS.CLONING]: { label: 'Fetching repository', variant: 'info' },
  [SCAN_STATUS.SCANNING_CODE]: { label: 'Scanning code', variant: 'info' },
  [SCAN_STATUS.SCANNING_DEPENDENCIES]: { label: 'Checking dependencies', variant: 'info' },
  [SCAN_STATUS.ANALYZING]: { label: 'Analyzing', variant: 'info' },
  [SCAN_STATUS.INVESTIGATING]: { label: 'AI investigating', variant: 'info' },
  [SCAN_STATUS.COMPLETED]: { label: 'Completed', variant: 'success' },
  [SCAN_STATUS.FAILED]: { label: 'Failed', variant: 'danger' },
};

export const AI_STATUS_META: Record<AiStatus, { label: string; variant: BadgeVariant }> = {
  [AI_STATUS.COMPLETED]: { label: 'AI checked', variant: 'success' },
  [AI_STATUS.UNAVAILABLE]: { label: 'AI off', variant: 'secondary' },
  [AI_STATUS.FAILED]: { label: 'AI check failed', variant: 'warning' },
};

export const TOOL_META: Record<ScannerTool, { label: string; purpose: string }> = {
  [SCANNER_TOOL.SEMGREP]: { label: 'Semgrep', purpose: 'Unsafe patterns and secrets in source code' },
  [SCANNER_TOOL.OSV_SCANNER]: { label: 'OSV-Scanner', purpose: 'Known vulnerabilities in open-source dependencies, in every supported language' },
  [SCANNER_TOOL.AI_AGENT]: { label: 'AI agent', purpose: 'Reads the code to check reachability and data flow, and re-rates every finding' },
};

export const REACHABILITY_META: Record<Reachability, { label: string; variant: BadgeVariant }> = {
  [REACHABILITY.REACHABLE]: { label: 'Reachable', variant: 'primary' },
  [REACHABILITY.NOT_REACHABLE]: { label: 'Not reachable', variant: 'success' },
  [REACHABILITY.UNKNOWN]: { label: 'Reachability unclear', variant: 'secondary' },
};

export const DATA_FLOW_STEP_META: Record<DataFlowStepKind, TokenMeta> = {
  [DATA_FLOW_STEP_KIND.SOURCE]: { label: 'Source (user input)', color: '#0369a1' },
  [DATA_FLOW_STEP_KIND.PROPAGATION]: { label: 'Passes through', color: '#4b5563' },
  [DATA_FLOW_STEP_KIND.SINK]: { label: 'Sink (dangerous call)', color: '#1e3a8a' },
};

export const FALSE_POSITIVE_META = { label: 'False positive', variant: 'success' } as const satisfies {
  label: string;
  variant: BadgeVariant;
};

export const FIX_STATUS_META = {
  available: { label: 'Fix available', variant: 'success' },
  unavailable: { label: 'No fix yet', variant: 'secondary' },
} as const satisfies Record<string, { label: string; variant: BadgeVariant }>;