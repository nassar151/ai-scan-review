import {
  AI_STATUS,
  SCANNER_TOOL,
  TOOL_RUN_STATUS,
  type Finding,
  type InvestigationInfo,
  type RepoRef,
  type ScanResult,
  type StageProgress,
} from '@scan/shared';
import { summarizeFindings } from '../../common/analysis/analyze';
import { maskSecrets } from '../../common/analysis/codeFindings';
import { plural, toMessage } from '../../common/utils/text';
import { describeLlmError } from '../llm/structuredCompletion';
import { applyInvestigation, verifyInvestigation } from './applyInvestigation';
import { createChatAgentStep } from './chatAgentStep';
import { investigateFinding } from './investigateFinding';
import {
  AGENT_CONCURRENCY,
  INVESTIGATION_BUDGET_MS,
  MAX_AGENT_TURNS,
  MAX_TOOL_OUTPUT_CHARS,
  NO_API_KEY_MESSAGE,
} from './investigation.consts';
import type { AgentStep } from './investigation.types';
import { createRepoTools } from './repoTools';

export interface InvestigatorOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Provider settings (see llm.consts); defaults suit a paid provider. */
  baseURL?: string;
  maxRetries?: number;
  agentConcurrency?: number;
  maxAgentTurns?: number;
  maxToolOutputChars?: number;
  /** Injected in tests; defaults to Chat Completions on the configured provider when an API key is set. */
  step?: AgentStep;
  budgetMs?: number;
}

export interface InvestigationRequest {
  repo: RepoRef;
  repoPath: string;
  result: ScanResult;
  onProgress: (message: string, progress?: StageProgress) => void;
}

/** Runs `worker` over `items` with at most `limit` in flight, preserving order. */
const mapWithConcurrency = async <T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
};

const isChanged = (finding: Finding) =>
  finding.investigation !== undefined &&
  (finding.severity !== finding.investigation.originalSeverity ||
    finding.riskScore !== finding.investigation.originalRiskScore ||
    finding.priority !== finding.investigation.originalPriority);

const skipped = (result: ScanResult, info: InvestigationInfo, message: string): ScanResult => ({
  ...result,
  ai: info,
  tools: [...result.tools, { tool: SCANNER_TOOL.AI_AGENT, status: TOOL_RUN_STATUS.SKIPPED, message }],
});

const EMPTY_COUNTS = { investigated: 0, changed: 0, falsePositives: 0, failed: 0 };

/**
 * An agent per finding (most urgent first) reads the cloned repo (search, read, list; never executes) to check
 * reachability and trace the data flow, then re-rates and re-explains the finding. Failures keep the
 * deterministic finding.
 */
export const createInvestigator = (options: InvestigatorOptions) => {
  const step = options.step ?? (options.apiKey ? createChatAgentStep(options) : undefined);
  const budgetMs = options.budgetMs ?? INVESTIGATION_BUDGET_MS;
  const limits = {
    maxTurns: options.maxAgentTurns ?? MAX_AGENT_TURNS,
    maxToolOutputChars: options.maxToolOutputChars ?? MAX_TOOL_OUTPUT_CHARS,
  };

  return async ({ repo, repoPath, result, onProgress }: InvestigationRequest): Promise<ScanResult> => {
    if (!step) {
      return skipped(
        result,
        { status: AI_STATUS.UNAVAILABLE, message: NO_API_KEY_MESSAGE, ...EMPTY_COUNTS },
        'No API key',
      );
    }
    const targets = result.findings;
    if (targets.length === 0) {
      return skipped(
        result,
        { status: AI_STATUS.COMPLETED, model: options.model, message: 'No findings to investigate', ...EMPTY_COUNTS },
        'No findings',
      );
    }

    const started = Date.now();
    const tools = await createRepoTools(repoPath);
    let done = 0;
    let failed = 0;
    let firstError: string | undefined;
    onProgress(`AI agent is reading the code behind ${plural(targets.length, 'finding')}…`, { done: 0, total: targets.length });

    const investigated = await mapWithConcurrency(targets, options.agentConcurrency ?? AGENT_CONCURRENCY, async (finding) => {
      if (Date.now() - started > budgetMs) return undefined;
      try {
        const run = await investigateFinding(step, tools, repo, finding, limits);
        const verified = await verifyInvestigation(run.output, tools, run.log);
        return applyInvestigation(finding, run.output, verified, run.log.length, options.model);
      } catch (error) {
        failed += 1;
        firstError ??= maskSecrets(toMessage(error));
        console.error(`AI investigation failed for ${finding.id}`, maskSecrets(describeLlmError(error)));
        return undefined;
      } finally {
        done += 1;
        onProgress(`AI agent investigated ${done} of ${plural(targets.length, 'finding')}…`, { done, total: targets.length });
      }
    });

    const updated = new Map(investigated.flatMap((finding) => (finding ? [[finding.id, finding] as const] : [])));
    const findings = result.findings.map((finding) => updated.get(finding.id) ?? finding);
    const changed = [...updated.values()];
    const notStarted = targets.length - updated.size - failed;
    const info: InvestigationInfo = {
      status: updated.size === 0 ? AI_STATUS.FAILED : AI_STATUS.COMPLETED,
      model: options.model,
      investigated: updated.size,
      changed: changed.filter(isChanged).length,
      falsePositives: changed.filter((finding) => finding.investigation?.falsePositive).length,
      failed,
      message:
        [
          notStarted > 0 && `Time budget reached; ${plural(notStarted, 'finding')} kept the scanner rating`,
          failed > 0 && `${plural(failed, 'finding')} failed: ${firstError}`,
        ]
          .filter(Boolean)
          .join('. ') || undefined,
    };

    return {
      ...result,
      ...summarizeFindings(repo, findings),
      ai: info,
      tools: [
        ...result.tools,
        {
          tool: SCANNER_TOOL.AI_AGENT,
          version: options.model,
          status: info.status === AI_STATUS.FAILED ? TOOL_RUN_STATUS.FAILED : TOOL_RUN_STATUS.SUCCEEDED,
          durationMs: Date.now() - started,
          message: `${plural(info.investigated, 'finding')} investigated, ${info.changed} re-rated, ${info.falsePositives} false positive(s)`,
        },
      ],
    };
  };
};

export type Investigator = ReturnType<typeof createInvestigator>;
