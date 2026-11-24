import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { LLM_TEMPERATURE, STRUCTURED_ATTEMPTS } from '../llm/llm.consts';
import type { LlmClientOptions } from '../llm/llm.types';
import { createLlmClient, parseJsonContent } from '../llm/llmClient';
import { parseStructured, recoverFailedGeneration, rejectedToolCall, requestStructured } from '../llm/structuredCompletion';
import { AGENT_TOOLS } from './agentTools.consts';
import { FINAL_ANSWER_REQUEST, INVESTIGATION_FORMAT_NAME } from './investigation.consts';
import { investigationSchema } from './investigation.schema';
import type { AgentInputItem, AgentStep, AgentStepResult } from './investigation.types';

export interface ChatAgentOptions extends LlmClientOptions {
  model: string;
}

const CHAT_TOOLS: ChatCompletionTool[] = AGENT_TOOLS.map((tool) => ({
  type: 'function',
  function: { name: tool.name, description: tool.description ?? undefined, parameters: tool.parameters ?? undefined },
}));

const TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.name);

const toMessage = (item: AgentInputItem): ChatCompletionMessageParam =>
  item.type === 'user' ? { role: 'user', content: item.content } : { role: 'tool', tool_call_id: item.callId, content: item.output };

/** The conversation as plain text, so the final structured call needs no tool messages (Groq rejects tools + JSON schema). */
const transcript = (messages: ChatCompletionMessageParam[]) =>
  messages
    .flatMap((message) => {
      if (message.role === 'user') return [`INPUT:\n${String(message.content)}`];
      if (message.role === 'tool') return [`TOOL RESULT:\n${String(message.content)}`];
      if (message.role !== 'assistant') return [];
      const calls = (message.tool_calls ?? []).flatMap((call) => (call.type === 'function' ? [`${call.function.name}(${call.function.arguments})`] : []));
      return [...(message.content ? [`YOU WROTE:\n${String(message.content)}`] : []), ...calls.map((call) => `YOU CALLED: ${call}`)];
    })
    .join('\n\n');

/**
 * One agent round-trip over OpenAI-compatible Chat Completions (GroqCloud, xAI, OpenAI). The API is stateless,
 * so each conversation is kept here under the returned responseId until the next turn picks it up.
 * When the model stops calling tools (or on the last turn) a separate call asks for the strict JSON answer.
 */
export const createChatAgentStep = ({ model, ...clientOptions }: ChatAgentOptions): AgentStep => {
  const client = createLlmClient(clientOptions);
  const conversations = new Map<string, ChatCompletionMessageParam[]>();

  const toolTurn = async (messages: ChatCompletionMessageParam[]): Promise<AgentStepResult | undefined> => {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        tools: CHAT_TOOLS,
        tool_choice: 'auto',
        temperature: LLM_TEMPERATURE,
      });
      const reply = completion.choices[0]?.message;
      const toolCalls = (reply?.tool_calls ?? []).flatMap((call) =>
        call.type === 'function' ? [{ id: call.id, name: call.function.name, arguments: call.function.arguments }] : [],
      );
      if (reply && toolCalls.length > 0) {
        const responseId = randomUUID();
        conversations.set(responseId, [...messages, { role: 'assistant', content: reply.content ?? null, tool_calls: reply.tool_calls }]);
        return { responseId, toolCalls };
      }
      const direct = parseStructured(investigationSchema, parseJsonContent(reply?.content));
      if (direct) return { responseId: completion.id, toolCalls: [], output: direct };
      if (reply?.content) messages.push({ role: 'assistant', content: reply.content });
      return undefined;
    } catch (error) {
      // gpt-oss sometimes "answers" by calling a tool named json; take that answer, or move on to the final call.
      if (!(error instanceof OpenAI.BadRequestError)) throw error;
      const recovered = parseStructured(investigationSchema, recoverFailedGeneration(error));
      return recovered ? { responseId: randomUUID(), toolCalls: [], output: recovered } : undefined;
    }
  };

  return async ({ instructions, input, previousResponseId, finalTurn }) => {
    const previous = previousResponseId ? conversations.get(previousResponseId) : undefined;
    if (previousResponseId) conversations.delete(previousResponseId);
    const messages: ChatCompletionMessageParam[] = [...(previous ?? [{ role: 'system', content: instructions }]), ...input.map(toMessage)];

    const turn = finalTurn ? undefined : await toolTurn(messages);
    if (turn) return turn;

    try {
      const { id, data } = await requestStructured({
        client,
        model,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: `${transcript(messages.slice(1))}\n\n${FINAL_ANSWER_REQUEST}` },
        ],
        schema: investigationSchema,
        name: INVESTIGATION_FORMAT_NAME,
        attempts: STRUCTURED_ATTEMPTS,
      });
      return { responseId: id, toolCalls: [], output: data };
    } catch (error) {
      // The model still wants to look at something: run that tool and let it answer afterwards.
      const call = rejectedToolCall(error, TOOL_NAMES);
      if (!call) throw error;
      const toolCall = { id: randomUUID(), ...call };
      const responseId = randomUUID();
      conversations.set(responseId, [
        ...messages,
        { role: 'assistant', content: null, tool_calls: [{ id: toolCall.id, type: 'function', function: { name: call.name, arguments: call.arguments } }] },
      ]);
      return { responseId, toolCalls: [toolCall] };
    }
  };
};
