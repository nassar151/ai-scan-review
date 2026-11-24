import OpenAI from 'openai';
import { CODE_FENCE } from './llm.consts';
import type { LlmClientOptions } from './llm.types';

/** GroqCloud, xAI and OpenAI all speak the OpenAI Chat Completions protocol; only the base URL differs. */
export const createLlmClient = ({ apiKey, baseURL, timeoutMs, maxRetries, fetch }: LlmClientOptions) =>
  new OpenAI({ apiKey, baseURL, timeout: timeoutMs, maxRetries, fetch });

/** Models sometimes wrap JSON in a ```json fence even when asked not to. */
export const parseJsonContent = (content: string | null | undefined): unknown => {
  if (!content) return undefined;
  try {
    return JSON.parse(content.trim().replace(CODE_FENCE, ''));
  } catch {
    return undefined;
  }
};
