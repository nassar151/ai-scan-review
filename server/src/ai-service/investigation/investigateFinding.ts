import type { Finding, RepoRef } from '@scan/shared';
import { compactFinding } from './compactFinding';
import { EXTRA_FINAL_TURNS, INVESTIGATOR_PROMPT, TRUNCATED_SUFFIX } from './investigation.consts';
import type { InvestigationOutput } from './investigation.schema';
import type { AgentInputItem, AgentStep, RepoTools, ToolLogEntry } from './investigation.types';

export interface AgentRun {
  output: InvestigationOutput;
  log: ToolLogEntry[];
}

export interface AgentLimits {
  maxTurns: number;
  /** Tool results are cut to this many characters to stay inside the provider's token limits. */
  maxToolOutputChars: number;
}

const findingPayload = (repo: RepoRef, finding: Finding, maxTurns: number) => ({
  repository: `${repo.owner}/${repo.name}`,
  finding: { ...compactFinding(finding), riskScore: finding.riskScore },
  toolBudget: `${maxTurns - 1} rounds of tool calls, then you must answer`,
});

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}${TRUNCATED_SUFFIX}` : text);

/** Tool-calling loop for one finding: the model reads the repo through `tools` until it returns a verdict. */
export const investigateFinding = async (
  step: AgentStep,
  tools: RepoTools,
  repo: RepoRef,
  finding: Finding,
  { maxTurns, maxToolOutputChars }: AgentLimits,
): Promise<AgentRun> => {
  const log: ToolLogEntry[] = [];
  let input: AgentInputItem[] = [{ type: 'user', content: JSON.stringify(findingPayload(repo, finding, maxTurns)) }];
  let previousResponseId: string | undefined;

  for (let turn = 1; turn <= maxTurns + EXTRA_FINAL_TURNS; turn += 1) {
    const result = await step({ instructions: INVESTIGATOR_PROMPT, input, previousResponseId, finalTurn: turn >= maxTurns });
    if (result.output) return { output: result.output, log };
    if (result.toolCalls.length === 0) throw new Error('The agent stopped without a verdict');

    input = await Promise.all(
      result.toolCalls.map(async (call) => {
        const execution = await tools.execute(call.name, call.arguments);
        log.push(execution.log);
        return { type: 'tool_result' as const, callId: call.id, output: truncate(execution.text, maxToolOutputChars) };
      }),
    );
    previousResponseId = result.responseId;
  }
  throw new Error(`No verdict within ${maxTurns} turns`);
};
