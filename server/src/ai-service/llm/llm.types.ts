import type { LLM_PROVIDER } from './llm.consts';

export type LlmProvider = (typeof LLM_PROVIDER)[keyof typeof LLM_PROVIDER];

/** Per-provider defaults; free tiers need fewer parallel agents and smaller requests. */
export interface ProviderPreset {
  label: string;
  /** undefined = the OpenAI SDK default (api.openai.com). */
  baseURL?: string;
  model: string;
  /** Env var read when AI_API_KEY is empty, e.g. GROQ_API_KEY. */
  keyEnv: string;
  maxRetries: number;
  agentConcurrency: number;
  maxAgentTurns: number;
  /** Characters of each tool result sent back to the model. */
  maxToolOutputChars: number;
}

/** Everything the AI steps need to call an OpenAI-compatible Chat Completions API. */
export interface LlmSettings extends ProviderPreset {
  provider: LlmProvider;
  apiKey: string;
  timeoutMs: number;
}

/** What the HTTP client needs; tests inject `fetch` to fake the provider. */
export interface LlmClientOptions {
  apiKey: string;
  baseURL?: string;
  timeoutMs: number;
  maxRetries?: number;
  fetch?: typeof fetch;
}
