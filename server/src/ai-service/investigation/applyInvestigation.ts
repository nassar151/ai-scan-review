import {
  DATA_FLOW_STEP_KIND,
  FINDING_TYPE,
  PRIORITY,
  REACHABILITY,
  RISK_SCORE_MAX,
  type Reachability,
  type CodeFix,
  type DataFlow,
  type DataFlowStep,
  type Finding,
  type InvestigationEvidence,
  type Priority,
} from '@scan/shared';
import { LIVE_CREDENTIAL_PATTERN } from '../../common/analysis/analysis.consts';
import { maskSecrets } from '../../common/analysis/codeFindings';
import { formatPoints, priorityFromScore, severityFromRiskScore } from '../../common/analysis/scoring';
import {
  MAX_FIX_LINES,
  REACHABILITY_FACTOR_LABEL,
  TRAILING_NEWLINES,
  UNVERIFIED_NOT_REACHABLE_NOTE,
  UNVERIFIED_REACHABLE_NOTE,
} from './investigation.consts';
import type { InvestigationOutput } from './investigation.schema';
import type { RepoTools, ToolLogEntry, VerifiedInvestigation } from './investigation.types';
import { cleanRelative } from './repoTools';

type EvidenceItem = InvestigationOutput['evidence'][number];
type FlowStepItem = InvestigationOutput['dataFlow']['steps'][number];
interface VerifiedLocation {
  path: string;
  line?: number;
}

const nonEmpty = (value: string, fallback: string) => value.trim() || fallback;

/** A file (and optional line) that really exists in the repo, or undefined. */
const verifyLocation = async (path: string | null, line: number | null, tools: RepoTools): Promise<VerifiedLocation | undefined> => {
  if (!path) return undefined;
  const lines = await tools.lineCount(path);
  if (lines === undefined) return undefined;
  if (line === null) return { path: cleanRelative(path) };
  const whole = Math.floor(line);
  return whole >= 1 && whole <= lines ? { path: cleanRelative(path), line: whole } : undefined;
};

const verifyItem = async (
  item: EvidenceItem,
  tools: RepoTools,
  searches: Map<string, number>,
): Promise<InvestigationEvidence | undefined> => {
  const note = item.note.trim();
  const matchCount = item.searchPattern === null ? undefined : searches.get(item.searchPattern.trim());
  if (item.searchPattern !== null && matchCount !== undefined) {
    return { note, searchPattern: item.searchPattern.trim(), matchCount };
  }
  const location = await verifyLocation(item.path, item.line, tools);
  return location && { note, ...location };
};

/** Data-flow steps keep their text; a location is attached only when the file and line exist. */
const verifyFlowStep = async (step: FlowStepItem, tools: RepoTools): Promise<DataFlowStep> => {
  const example = step.example?.trim();
  return {
    kind: step.kind,
    description: step.description.trim(),
    ...(example && { example }),
    ...(await verifyLocation(step.path, step.line, tools)),
  };
};

/** Examples are masked for secret findings, and anywhere a value looks like a live credential. */
const maskExamples = (flow: DataFlow, isSecret: boolean): DataFlow => ({
  ...flow,
  steps: flow.steps.map((step) =>
    step.example && (isSecret || LIVE_CREDENTIAL_PATTERN.test(step.example)) ? { ...step, example: maskSecrets(step.example) } : step,
  ),
});

const verifyDataFlow = async (flow: InvestigationOutput['dataFlow'], tools: RepoTools): Promise<DataFlow> => ({
  summary: flow.summary.trim(),
  steps: (await Promise.all(flow.steps.map((step) => verifyFlowStep(step, tools)))).filter((step) => step.description),
});

/**
 * Keeps a suggested fix only when its line range exists and is small. The original code is read from the
 * repo by the backend (never taken from the model) and both sides are secret-masked.
 */
const verifyCodeFix = async (fix: InvestigationOutput['codeFix'], tools: RepoTools): Promise<CodeFix | undefined> => {
  const fixedCode = fix?.fixedCode.replace(TRAILING_NEWLINES, '');
  if (!fix || !fixedCode?.trim()) return undefined;
  const lines = await tools.readLines(fix.path);
  const startLine = Math.floor(fix.startLine);
  const endLine = Math.floor(fix.endLine);
  if (!lines || startLine < 1 || endLine < startLine || endLine > lines.length || endLine - startLine >= MAX_FIX_LINES) return undefined;
  const originalCode = lines.slice(startLine - 1, endLine).join('\n');
  if (originalCode === fixedCode) return undefined;
  return {
    path: cleanRelative(fix.path),
    startLine,
    endLine,
    originalCode: maskSecrets(originalCode) ?? '',
    fixedCode: maskSecrets(fixedCode) ?? '',
    explanation: fix.explanation.trim(),
  };
};

/** Keeps only what the backend can confirm: real files and lines, searches the agent really ran, real fix ranges. */
export const verifyInvestigation = async (
  output: InvestigationOutput,
  tools: RepoTools,
  log: ToolLogEntry[],
): Promise<VerifiedInvestigation> => {
  const searches = new Map(
    log.flatMap((entry) => (entry.searchPattern !== undefined && entry.matchCount !== undefined ? [[entry.searchPattern, entry.matchCount] as const] : [])),
  );
  const [checked, dataFlow, codeFix] = await Promise.all([
    Promise.all(output.evidence.map((item) => verifyItem(item, tools, searches))),
    verifyDataFlow(output.dataFlow, tools),
    verifyCodeFix(output.codeFix, tools),
  ]);
  return { evidence: checked.filter((item): item is InvestigationEvidence => item !== undefined), dataFlow, codeFix };
};

const newPriority = (finding: Finding, falsePositive: boolean, riskScore: number): Priority => {
  if (falsePositive) return PRIORITY.MONITOR;
  if (riskScore === finding.riskScore) return finding.priority;
  return priorityFromScore(riskScore);
};

/** Every change needs a reason; a changed risk score needs its own. */
const isExplained = ({ rating }: InvestigationOutput, scoreChanged: boolean) =>
  rating.changeReason.trim() !== '' && (!scoreChanged || rating.riskScoreReason.trim() !== '');

const rejectionFor = (backed: boolean, output: InvestigationOutput, finding: Finding, proposedScore: number) =>
  backed
    ? `The agent changed the risk score from ${finding.riskScore} to ${proposedScore} without explaining why, so the scanner rating was kept.`
    : `The agent proposed ${output.rating.severity} (score ${proposedScore}) without verifiable evidence, so the scanner rating was kept.`;

/** "Reachable" must be shown by the attack path: a sink step at a file that really exists. */
const hasVerifiedSink = (dataFlow: DataFlow) =>
  dataFlow.steps.some((step) => step.kind === DATA_FLOW_STEP_KIND.SINK && step.path !== undefined);

/** "Not reachable" must be backed by a verified item, e.g. a search for the import that found nothing. */
const checkedReachability = (output: InvestigationOutput, dataFlow: DataFlow, evidence: InvestigationEvidence[]) => {
  const { status, explanation } = output.reachability;
  if (status === REACHABILITY.REACHABLE && !hasVerifiedSink(dataFlow)) {
    return { status: REACHABILITY.UNKNOWN, explanation: UNVERIFIED_REACHABLE_NOTE };
  }
  if (status === REACHABILITY.NOT_REACHABLE && evidence.length === 0) {
    return { status: REACHABILITY.UNKNOWN, explanation: UNVERIFIED_NOT_REACHABLE_NOTE };
  }
  return { status, explanation: explanation.trim() || undefined };
};

const factorLabel = (output: InvestigationOutput, reachability: Reachability, delta: number) => {
  const verdict = `AI investigation: ${REACHABILITY_FACTOR_LABEL[reachability]}${output.falsePositive ? ', false positive' : ''}`;
  return delta === 0 ? `${verdict}, rating confirmed` : `${verdict} (${formatPoints(delta)})`;
};

/**
 * Applies the agent's verdict. Any severity, score or false-positive change needs verified backing (an evidence
 * item or a data-flow step with a real location) and a reason; a score change needs its own reason. Otherwise the
 * scanner rating is kept and the rejection is recorded. Priority always comes from the backend thresholds.
 */
export const applyInvestigation = (
  finding: Finding,
  output: InvestigationOutput,
  { evidence, dataFlow, codeFix }: VerifiedInvestigation,
  toolCalls: number,
  model: string,
): Finding => {
  const { rating } = output;
  const proposedScore = Math.max(0, Math.min(RISK_SCORE_MAX, Math.round(rating.riskScore)));
  const scoreChanged = proposedScore !== finding.riskScore;
  const wantsChange = scoreChanged || output.falsePositive;
  const backed = evidence.length > 0 || dataFlow.steps.some((step) => step.path !== undefined);
  const accepted = !wantsChange || (backed && isExplained(output, scoreChanged));
  const riskScore = accepted ? proposedScore : finding.riskScore;
  const falsePositive = accepted && output.falsePositive;
  const reachability = checkedReachability(output, dataFlow, evidence);

  return {
    ...finding,
    severity: severityFromRiskScore(riskScore),
    severityReason: accepted && scoreChanged ? nonEmpty(rating.severityReason, finding.severityReason) : finding.severityReason,
    riskScore,
    priority: accepted && wantsChange ? newPriority(finding, falsePositive, riskScore) : finding.priority,
    whyItMatters: nonEmpty(output.whyItMatters, finding.whyItMatters),
    attackScenario: nonEmpty(output.attackScenario, finding.attackScenario ?? ''),
    riskFactors: [...finding.riskFactors, factorLabel(output, reachability.status, riskScore - finding.riskScore)],
    investigation: {
      reachability: reachability.status,
      reachabilityExplanation: reachability.explanation,
      dataFlow:
        reachability.status === REACHABILITY.REACHABLE ? maskExamples(dataFlow, finding.type === FINDING_TYPE.SECRET) : undefined,
      changeReason: accepted ? rating.changeReason.trim() || undefined : undefined,
      riskScoreReason: accepted && scoreChanged ? rating.riskScoreReason.trim() : undefined,
      verdict: output.verdict.trim(),
      falsePositive,
      confidence: output.confidence,
      evidence,
      originalSeverity: finding.severity,
      originalSeverityReason: finding.severityReason,
      originalRiskScore: finding.riskScore,
      originalPriority: finding.priority,
      changeRejected: accepted ? undefined : rejectionFor(backed, output, finding, proposedScore),
      codeFix: falsePositive ? undefined : codeFix,
      toolCalls,
      model,
    },
  };
};
