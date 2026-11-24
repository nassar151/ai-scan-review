import { DEFAULT_AI_TIMEOUT_MS, DEFAULT_LLM_PROVIDER, LLM_PROVIDER, PROVIDER_PRESETS } from './llm.consts';
import type { LlmProvider, LlmSettings } from './llm.types';

type Env = Record<string, string | undefined>;

const isProvider = (value: string): value is LlmProvider => Object.values<string>(LLM_PROVIDER).includes(value);

const positive = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** AI_PROVIDER wins; otherwise the first provider whose own key (GROQ_API_KEY, XAI_API_KEY, OPENAI_API_KEY) is set. */
const pickProvider = (env: Env): LlmProvider => {
  const explicit = env.AI_PROVIDER?.trim().toLowerCase() ?? '';
  if (isProvider(explicit)) return explicit;
  const withKey = Object.values(LLM_PROVIDER).find((provider) => env[PROVIDER_PRESETS[provider].keyEnv]);
  return withKey ?? DEFAULT_LLM_PROVIDER;
};

/** Reads the AI settings from the environment: provider preset, then AI_API_KEY / AI_MODEL / AI_BASE_URL overrides. */
export const resolveLlmSettings = (env: Env): LlmSettings => {
  const provider = pickProvider(env);
  const preset = PROVIDER_PRESETS[provider];
  return {
    ...preset,
    provider,
    apiKey: env.AI_API_KEY || env[preset.keyEnv] || '',
    model: env.AI_MODEL || preset.model,
    baseURL: env.AI_BASE_URL || preset.baseURL,
    timeoutMs: positive(env.AI_TIMEOUT_MS, DEFAULT_AI_TIMEOUT_MS),
    agentConcurrency: positive(env.AI_CONCURRENCY, preset.agentConcurrency),
  };
};
