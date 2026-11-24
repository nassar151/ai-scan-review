import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { z } from 'zod';
import { fillEmptyFields } from './fillEmptyFields';
import { EMPTY_GENERATION, FAILED_GENERATION_LOG_CHARS, LLM_RETRY_TEMPERATURE, LLM_TEMPERATURE, TOOL_USE_FAILED } from './llm.consts';
import { parseJsonContent } from './llmClient';

interface StructuredRequest<T extends z.ZodType> {
  client: OpenAI;
  model: string;
  messages: ChatCompletionMessageParam[];
  schema: T;
  name: string;
  attempts: number;
  temperature?: number;
}

export interface StructuredResult<T> {
  id: string;
  data: T;
}

/** Validates model JSON against the schema after filling in fields whose only possible value is empty. */
export const parseStructured = <T extends z.ZodType>(schema: T, value: unknown): z.infer<T> | undefined => {
  const parsed = schema.safeParse(fillEmptyFields(schema, value));
  return parsed.success ? parsed.data : undefined;
};

/**
 * Groq rejects a generation that breaks the schema (400 json_validate_failed) or calls a tool that doesn't
 * exist (400 tool_use_failed) but returns the generated text, which is usually one empty field away from valid.
 */
const failedGeneration = (error: unknown) => {
  if (!(error instanceof OpenAI.BadRequestError)) return undefined;
  const failed = (error.error as { failed_generation?: unknown } | undefined)?.failed_generation;
  return typeof failed === 'string' ? failed : undefined;
};

export const recoverFailedGeneration = (error: unknown): unknown => {
  const parsed = parseJsonContent(failedGeneration(error));
  const call = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
  const args = (call as { arguments?: unknown } | undefined)?.arguments;
  if (args === undefined) return call;
  return typeof args === 'string' ? parseJsonContent(args) : args;
};

/** The tool call inside a generation Groq rejected because no tools were offered, if it names one of `toolNames`. */
export const rejectedToolCall = (error: unknown, toolNames: readonly string[]) => {
  const parsed = parseJsonContent(failedGeneration(error));
  const call = (Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed) as { name?: unknown; arguments?: unknown } | undefined;
  if (typeof call?.name !== 'string' || !toolNames.includes(call.name)) return undefined;
  return { name: call.name, arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments ?? {}) };
};

/** The error message plus the start of what the model generated, for the server log. */
export const describeLlmError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const generated = failedGeneration(error);
  if (generated === undefined) return message;
  return `${message} | generated: ${generated.trim() ? generated.slice(0, FAILED_GENERATION_LOG_CHARS) : EMPTY_GENERATION}`;
};

/** One strict JSON-schema request, recovered or sampled again when the provider rejects the generation. */
export const requestStructured = async <T extends z.ZodType>(request: StructuredRequest<T>): Promise<StructuredResult<z.infer<T>>> => {
  const { client, model, messages, schema, name, attempts, temperature = LLM_TEMPERATURE } = request;
  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      response_format: zodResponseFormat(schema, name),
    });
    const data = parseStructured(schema, parseJsonContent(completion.choices[0]?.message.content));
    if (data === undefined) throw new Error(`The model did not return a valid ${name} JSON`);
    return { id: completion.id, data };
  } catch (error) {
    const recovered = parseStructured(schema, recoverFailedGeneration(error));
    if (recovered !== undefined) return { id: error instanceof OpenAI.APIError ? (error.requestID ?? name) : name, data: recovered };
    // A tool call is the model's choice, not a sampling slip: asking again the same way gives the same call.
    const toolCall = error instanceof OpenAI.BadRequestError && error.code === TOOL_USE_FAILED;
    const retryable = !toolCall && (error instanceof OpenAI.BadRequestError || !(error instanceof OpenAI.APIError));
    if (attempts <= 1 || !retryable) throw error;
    return requestStructured({ ...request, attempts: attempts - 1, temperature: LLM_RETRY_TEMPERATURE });
  }
};
