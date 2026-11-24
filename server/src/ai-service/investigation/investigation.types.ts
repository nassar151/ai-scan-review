import type { CodeFix, DataFlow, InvestigationEvidence } from '@scan/shared';
import type { InvestigationOutput } from './investigation.schema';

export interface VerifiedInvestigation {
  evidence: InvestigationEvidence[];
  dataFlow: DataFlow;
  codeFix?: CodeFix;
}

export interface AgentToolCall {
  id: string;
  name: string;
  /** Raw JSON arguments as produced by the model. */
  arguments: string;
}

export type AgentInputItem =
  | { type: 'user'; content: string }
  | { type: 'tool_result'; callId: string; output: string };

export interface AgentStepRequest {
  instructions: string;
  input: AgentInputItem[];
  /** Continues the same conversation (OpenAI Responses API previous_response_id). */
  previousResponseId?: string;
  /** Last turn: tools are disabled so the model must answer. */
  finalTurn: boolean;
}

export interface AgentStepResult {
  responseId: string;
  toolCalls: AgentToolCall[];
  output?: InvestigationOutput;
}

/** One model round-trip. Injected in tests; defaults to OpenAI with function tools and structured output. */
export type AgentStep = (request: AgentStepRequest) => Promise<AgentStepResult>;

/** What each tool call did, kept so search evidence can be verified against searches that really ran. */
export interface ToolLogEntry {
  name: string;
  searchPattern?: string;
  matchCount?: number;
}

export interface ToolExecution {
  text: string;
  log: ToolLogEntry;
}

export interface RepoTools {
  execute(name: string, rawArguments: string): Promise<ToolExecution>;
  /** Number of lines in a repo file, or undefined when the path is missing or outside the repo. */
  lineCount(relativePath: string): Promise<number | undefined>;
  /** All lines of a repo file, or undefined when it cannot be read. */
  readLines(relativePath: string): Promise<string[] | undefined>;
}
