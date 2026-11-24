import type { LlmProvider, ProviderPreset } from './llm.types';

/** 0 = the most likely answer every time, so re-scanning the same code gives the same verdicts. */
export const LLM_TEMPERATURE = 0;
/** A retry after a rejected generation must sample differently; at 0 it would repeat the same invalid answer. */
export const LLM_RETRY_TEMPERATURE = 0.3;

export const LLM_PROVIDER = {
  GROQ: 'groq',
  XAI: 'xai',
  OPENAI: 'openai',
} as const;

/** Used when AI_PROVIDER is not set and no provider-specific key is found. GroqCloud has a free tier. */
export const DEFAULT_LLM_PROVIDER: LlmProvider = LLM_PROVIDER.GROQ;

export const PROVIDER_PRESETS: Record<LlmProvider, ProviderPreset> = {
  [LLM_PROVIDER.GROQ]: {
    label: 'GroqCloud',
    baseURL: 'https://api.groq.com/openai/v1',
    // Supports tool calls and strict JSON-schema output; free tier: 30 requests and 8K tokens per minute, 200K per day.
    model: 'openai/gpt-oss-120b',
    keyEnv: 'GROQ_API_KEY',
    maxRetries: 6,
    agentConcurrency: 1,
    maxAgentTurns: 5,
    maxToolOutputChars: 3000,
  },
  [LLM_PROVIDER.XAI]: {
    label: 'xAI Grok',
    baseURL: 'https://api.x.ai/v1',
    model: 'grok-4.7',
    keyEnv: 'XAI_API_KEY',
    maxRetries: 3,
    agentConcurrency: 4,
    maxAgentTurns: 8,
    maxToolOutputChars: 12_000,
  },
  [LLM_PROVIDER.OPENAI]: {
    label: 'OpenAI',
    model: 'gpt-4.1-mini',
    keyEnv: 'OPENAI_API_KEY',
    maxRetries: 2,
    agentConcurrency: 6,
    maxAgentTurns: 8,
    maxToolOutputChars: 12_000,
  },
};

export const DEFAULT_AI_TIMEOUT_MS = 90_000;
export const CODE_FENCE = /^```(?:json)?\s*|\s*```$/g;
/** Requests per structured answer: a rejected generation that can't be recovered is sampled once more. */
export const STRUCTURED_ATTEMPTS = 2;
export const FAILED_GENERATION_LOG_CHARS = 300;
export const EMPTY_GENERATION = '(empty)';
/** Groq's error code when the model calls a tool that was not offered. */
export const TOOL_USE_FAILED = 'tool_use_failed';
