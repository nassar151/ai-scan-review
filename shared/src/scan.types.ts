import type {
  AI_STATUS,
  CONFIDENCE,
  DATA_FLOW_STEP_KIND,
  EFFORT,
  FINDING_TYPE,
  PRIORITY,
  REACHABILITY,
  RISK_GRADE,
  SCANNER_TOOL,
  SCAN_EVENT_TYPE,
  SCAN_STATUS,
  SEVERITY,
  STAGE_STATE,
  TOOL_RUN_STATUS,
} from './scan.consts';

type ValueOf<T> = T[keyof T];

export type ScanStatus = ValueOf<typeof SCAN_STATUS>;
export type StageState = ValueOf<typeof STAGE_STATE>;
export type Severity = ValueOf<typeof SEVERITY>;
export type Priority = ValueOf<typeof PRIORITY>;
export type FindingType = ValueOf<typeof FINDING_TYPE>;
export type Effort = ValueOf<typeof EFFORT>;
export type Confidence = ValueOf<typeof CONFIDENCE>;
export type RiskGrade = ValueOf<typeof RISK_GRADE>;
export type ScannerTool = ValueOf<typeof SCANNER_TOOL>;
export type ToolRunStatus = ValueOf<typeof TOOL_RUN_STATUS>;
export type ScanEventType = ValueOf<typeof SCAN_EVENT_TYPE>;
export type AiStatus = ValueOf<typeof AI_STATUS>;
export type Reachability = ValueOf<typeof REACHABILITY>;
export type DataFlowStepKind = ValueOf<typeof DATA_FLOW_STEP_KIND>;

/** ISO-8601 timestamp string. */
export type IsoDate = string;

export interface RepoRef {
  owner: string;
  name: string;
  /** Canonical https://github.com/owner/name URL. */
  url: string;
  defaultBranch?: string;
  commitSha?: string;
}

export interface StageProgress {
  done: number;
  total: number;
}

export interface ScanStage {
  status: ScanStatus;
  label: string;
  state: StageState;
  /** Short human-readable progress note, e.g. "Found 412 dependencies". */
  detail?: string;
  /** Countable work inside a running stage, e.g. findings the AI agent has checked. */
  progress?: StageProgress;
  startedAt?: IsoDate;
  finishedAt?: IsoDate;
}

export interface ToolRun {
  tool: ScannerTool;
  version?: string;
  status: ToolRunStatus;
  durationMs?: number;
  rawFindingCount?: number;
  message?: string;
}

export interface Reference {
  label: string;
  url: string;
}

export interface CodeLocation {
  path: string;
  line?: number;
  endLine?: number;
  snippet?: string;
}

/** One published vulnerability (GHSA/CVE) affecting a dependency. */
export interface Advisory {
  /** Primary OSV id, usually GHSA-xxxx. */
  id: string;
  cveIds: string[];
  title: string;
  /** Original advisory text (trimmed). */
  description: string;
  severity: Severity;
  cvssScore?: number;
  cvssVector?: string;
  /** Why this severity, derived from the CVSS vector, e.g. "Exploitable over the network, no login needed". */
  severityReason: string;
  fixedVersion?: string;
  cwe: string[];
  publishedAt?: IsoDate;
  url: string;
}

export interface DependencyInfo {
  ecosystem: string;
  packageName: string;
  installedVersion: string;
  /** Lowest version that fixes every advisory grouped into this finding. */
  fixedVersion?: string;
  /** "patch" | "minor" | "major" upgrade needed to reach fixedVersion. */
  upgradeType?: string;
  /** undefined when the dependency file format does not say whether the package is direct. */
  isDirect?: boolean;
  isDev: boolean;
  /** Chains from a direct dependency down to the vulnerable package. */
  introducedVia: string[][];
  /** Lockfiles / manifests where this package version was found. */
  manifests: string[];
  advisories: Advisory[];
}

export interface Finding {
  id: string;
  type: FindingType;
  title: string;
  /** What the issue is, in neutral terms (scanner / advisory text). */
  description: string;
  severity: Severity;
  /** Why this severity was assigned (facts: CVSS metrics, rule impact/likelihood). */
  severityReason: string;
  /** 0-100, context-adjusted (severity, exposure, fixability). */
  riskScore: number;
  priority: Priority;
  confidence: Confidence;
  /** Plain-English impact: why this matters for this repo. */
  whyItMatters: string;
  /** How an attacker could realistically abuse it. */
  attackScenario?: string;
  /** Concrete next step. */
  recommendedAction: string;
  /** Ordered steps to fix. */
  fixSteps: string[];
  effort: Effort;
  fixAvailable: boolean;
  /** Short reasons that moved the risk score, e.g. "Production dependency". */
  riskFactors: string[];
  locations: CodeLocation[];
  /** Total occurrences (locations may be truncated). */
  occurrences: number;
  dependency?: DependencyInfo;
  cwe: string[];
  owasp: string[];
  references: Reference[];
  source: ScannerTool;
  ruleIds: string[];
  /** Present when the AI agent read the repository code to re-check this finding. */
  investigation?: FindingInvestigation;
}

/** Backend-verified proof for a verdict: a real file location, or a search the agent actually ran. */
export interface InvestigationEvidence {
  note: string;
  path?: string;
  line?: number;
  searchPattern?: string;
  /** Matches the search really returned, recorded by the backend. */
  matchCount?: number;
}

/** A code change suggested by the AI agent; the backend read `originalCode` from the repo itself. */
export interface CodeFix {
  path: string;
  startLine: number;
  endLine: number;
  originalCode: string;
  fixedCode: string;
  explanation: string;
}

export interface DataFlowStep {
  kind: DataFlowStepKind;
  description: string;
  /** Concrete value at this step, e.g. the attacker's payload or the resulting SQL string. Secret-masked. */
  example?: string;
  /** Only kept when the backend confirmed the file and line exist. */
  path?: string;
  line?: number;
}

export interface DataFlow {
  /** One line, e.g. "req.body.name → StudentDAO.create() → cur.execute(q)". */
  summary: string;
  steps: DataFlowStep[];
}

export interface FindingInvestigation {
  reachability: Reachability;
  /** Why it is (not) reachable, in one or two sentences. Missing on scans made before this field existed. */
  reachabilityExplanation?: string;
  dataFlow?: DataFlow;
  /** Short reason the severity / risk score changed, or why the scanner rating was kept. */
  changeReason?: string;
  /** Why the risk score moved; set whenever the AI changed it. */
  riskScoreReason?: string;
  /** One-sentence conclusion, e.g. "lodash.template is never called". */
  verdict: string;
  falsePositive: boolean;
  confidence: Confidence;
  evidence: InvestigationEvidence[];
  /** Scanner rating before the agent's change, so the UI can show both. */
  originalSeverity: Severity;
  originalSeverityReason: string;
  originalRiskScore: number;
  originalPriority: Priority;
  /** Why a proposed change was not applied (no verifiable evidence, or no reason for it). */
  changeRejected?: string;
  codeFix?: CodeFix;
  toolCalls: number;
  model: string;
}

/** The AI agent pass that re-checks every finding in the code. */
export interface InvestigationInfo {
  status: AiStatus;
  model?: string;
  message?: string;
  investigated: number;
  /** Findings whose severity, score or priority the agent changed. */
  changed: number;
  falsePositives: number;
  failed: number;
}

export interface NextAction {
  title: string;
  description: string;
  priority: Priority;
  findingIds: string[];
}

export type SeverityCounts = Record<Severity, number>;
export type FindingTypeCounts = Record<FindingType, number>;

export interface ScanStats {
  filesScanned: number;
  dependenciesScanned: number;
  directDependencies: number;
  /** Raw scanner hits before grouping/deduplication. */
  rawFindings: number;
}

export interface ScanResult {
  grade: RiskGrade;
  riskScore: number;
  headline: string;
  summary: string;
  nextActions: NextAction[];
  severityCounts: SeverityCounts;
  typeCounts: FindingTypeCounts;
  findings: Finding[];
  stats: ScanStats;
  tools: ToolRun[];
  ai: InvestigationInfo;
  /** Non-fatal issues during the scan, e.g. "Could not generate a lockfile for packages/web". */
  warnings: string[];
}

export interface Scan {
  id: string;
  repo: RepoRef;
  status: ScanStatus;
  stages: ScanStage[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
  startedAt?: IsoDate;
  finishedAt?: IsoDate;
  error?: string;
  result?: ScanResult;
}

/** Lightweight shape for scan lists (no findings). */
export interface ScanSummary {
  id: string;
  repo: RepoRef;
  status: ScanStatus;
  createdAt: IsoDate;
  finishedAt?: IsoDate;
  grade?: RiskGrade;
  severityCounts?: SeverityCounts;
  error?: string;
}

export interface CreateScanRequest {
  repoUrl: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface ScanEvent {
  type: ScanEventType;
  scan: Scan;
}
