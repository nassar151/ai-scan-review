import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DATA_FLOW_STEP_KIND, REACHABILITY, SEVERITY } from '@scan/shared';
import { createChatAgentStep } from '../src/ai-service/investigation/chatAgentStep';
import { investigationSchema, type InvestigationOutput } from '../src/ai-service/investigation/investigation.schema';
import { createInvestigator } from '../src/ai-service/investigation/investigator';
import { LLM_PROVIDER, LLM_RETRY_TEMPERATURE } from '../src/ai-service/llm/llm.consts';
import { resolveLlmSettings } from '../src/ai-service/llm/resolveLlmSettings';
import { parseStructured } from '../src/ai-service/llm/structuredCompletion';
import { analyze } from '../src/common/analysis/analyze';
import { buildDependencyScan } from './support/fakeScanOutputs';

const REPO = { owner: 'acme', name: 'shop', url: 'https://github.com/acme/shop' };

const answer: InvestigationOutput = {
  reachability: { status: REACHABILITY.NOT_REACHABLE, explanation: 'Only _.pick is used.' },
  dataFlow: { summary: 'No user input reaches _.template.', steps: [{ kind: DATA_FLOW_STEP_KIND.SINK, description: 'lodash import', example: null, path: 'index.js', line: 1 }] },
  rating: { severity: SEVERITY.LOW, riskScore: 30, severityReason: 'LOW: never called.', changeReason: 'Lowered to low: _.template is never called.', riskScoreReason: '_.template is never called.' },
  falsePositive: false,
  confidence: 'high',
  verdict: 'Not reachable.',
  whyItMatters: 'Unused function.',
  attackScenario: 'None.',
  evidence: [{ note: 'No call', path: null, line: null, searchPattern: '_.template(' }],
  codeFix: null,
};

const completion = (message: object) => ({
  id: `chatcmpl-${Math.random()}`,
  object: 'chat.completion',
  created: 0,
  model: 'test-model',
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: null, ...message } }],
});

const JSON_HEADERS = { 'content-type': 'application/json' };

/** What Groq returns when it rejects a generation; `failed_generation` is the text the model produced. */
const rejected = (code: string, failedGeneration?: unknown) =>
  new Response(
    JSON.stringify({
      error: {
        message: 'Generated JSON does not match the expected schema.',
        type: 'invalid_request_error',
        code,
        ...(failedGeneration === undefined ? {} : { failed_generation: JSON.stringify(failedGeneration) }),
      },
    }),
    { status: 400, headers: JSON_HEADERS },
  );

const { codeFix: _codeFix, ...answerWithoutCodeFix } = answer;

/** Fake OpenAI-compatible endpoint: replies in order and records every request body. */
const fakeProvider = (replies: (object | Response)[]) => {
  const bodies: Record<string, unknown>[] = [];
  const fetchFn = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    const reply = replies[bodies.length - 1] ?? {};
    return reply instanceof Response ? reply : new Response(JSON.stringify(completion(reply)), { status: 200, headers: JSON_HEADERS });
  }) as typeof fetch;
  return { fetchFn, bodies };
};

describe('LLM provider settings', () => {
  it('defaults to GroqCloud and reads the provider key and overrides', () => {
    expect(resolveLlmSettings({})).toMatchObject({ provider: LLM_PROVIDER.GROQ, apiKey: '', model: 'openai/gpt-oss-120b', agentConcurrency: 1 });
    expect(resolveLlmSettings({ GROQ_API_KEY: 'gsk' })).toMatchObject({ provider: LLM_PROVIDER.GROQ, apiKey: 'gsk', baseURL: 'https://api.groq.com/openai/v1' });
    expect(resolveLlmSettings({ XAI_API_KEY: 'xai' })).toMatchObject({ provider: LLM_PROVIDER.XAI, apiKey: 'xai', baseURL: 'https://api.x.ai/v1' });
    expect(resolveLlmSettings({ OPENAI_API_KEY: 'sk' })).toMatchObject({ provider: LLM_PROVIDER.OPENAI, apiKey: 'sk', baseURL: undefined });
    expect(resolveLlmSettings({ AI_PROVIDER: 'xai', AI_API_KEY: 'k', AI_MODEL: 'grok-x', AI_CONCURRENCY: '2' })).toMatchObject({
      provider: LLM_PROVIDER.XAI,
      apiKey: 'k',
      model: 'grok-x',
      agentConcurrency: 2,
    });
  });
});

describe('chat completions agent', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-'));
    await fs.writeFile(path.join(root, 'index.js'), "const _ = require('lodash');\nmodule.exports = _.pick;\n");
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('calls tools, then asks for the strict JSON answer without tools, and applies it', async () => {
    const { fetchFn, bodies } = fakeProvider([
      { tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_code', arguments: JSON.stringify({ pattern: '_.template(', isRegex: false, pathPrefix: null }) } }] },
      { content: 'I have enough information.' },
      { content: JSON.stringify(answer) },
    ]);
    const step = createChatAgentStep({ apiKey: 'test', baseURL: 'https://llm.test/v1', timeoutMs: 1000, maxRetries: 0, model: 'test-model', fetch: fetchFn });
    const before = analyze({ repo: REPO, code: undefined, dependencies: buildDependencyScan(), tools: [], warnings: [] });

    const result = await createInvestigator({ apiKey: 'test', model: 'test-model', timeoutMs: 1000, step })({ repo: REPO, repoPath: root, result: before, onProgress: () => {} });

    expect(bodies).toHaveLength(3);
    expect(bodies[0]).toMatchObject({ model: 'test-model', tool_choice: 'auto' });
    expect(bodies[0]?.tools).toHaveLength(3);
    expect(bodies[1]?.messages).toContainEqual({ role: 'tool', tool_call_id: 'call_1', content: 'No matches for "_.template(".' });
    expect(bodies[2]).not.toHaveProperty('tools');
    expect(bodies[2]?.response_format).toMatchObject({ type: 'json_schema', json_schema: { strict: true } });
    expect(JSON.stringify(bodies[2]?.messages)).toContain('TOOL RESULT');
    expect(result.findings[0]).toMatchObject({ severity: SEVERITY.LOW, riskScore: 30 });
    expect(result.findings[0]?.investigation?.changeReason).toBe('Lowered to low: _.template is never called.');
  });

  const stepWith = (replies: (object | Response)[]) => {
    const provider = fakeProvider(replies);
    const step = createChatAgentStep({ apiKey: 'test', baseURL: 'https://llm.test/v1', timeoutMs: 1000, maxRetries: 0, model: 'test-model', fetch: provider.fetchFn });
    return { step, bodies: provider.bodies };
  };
  const request = (finalTurn: boolean) => ({ instructions: 'rules', input: [{ type: 'user' as const, content: 'finding' }], finalTurn });

  it('asks again when a rejected final answer cannot be recovered', async () => {
    const { step, bodies } = stepWith([rejected('json_validate_failed'), { content: JSON.stringify(answer) }]);

    const result = await step(request(true));

    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual({ ...bodies[0], temperature: LLM_RETRY_TEMPERATURE });
    expect(result.output).toEqual(answer);
  });

  it('recovers a rejected final answer that only left out codeFix', async () => {
    const { step, bodies } = stepWith([rejected('json_validate_failed', answerWithoutCodeFix)]);

    const result = await step(request(true));

    expect(bodies).toHaveLength(1);
    expect(result.output).toEqual(answer);
  });

  it('takes the answer from a call to a tool named json instead of failing the finding', async () => {
    const { step, bodies } = stepWith([rejected('tool_use_failed', { name: 'json', arguments: answer })]);

    const result = await step(request(false));

    expect(bodies).toHaveLength(1);
    expect(result.output).toEqual(answer);
  });

  it('recovers a final answer sent as a tool call although no tools were offered', async () => {
    const { step, bodies } = stepWith([rejected('tool_use_failed', [{ name: 'json', arguments: JSON.stringify(answer) }])]);

    const result = await step(request(true));

    expect(bodies).toHaveLength(1);
    expect(JSON.stringify(bodies[0]?.messages)).toContain('do not call any tool');
    expect(result.output).toEqual(answer);
  });

  it('runs the tool the model still calls in the final request, then asks for the answer again', async () => {
    const search = { pathPrefix: 'sqli', pattern: 'cur.execute', isRegex: false };
    const { step, bodies } = stepWith([rejected('tool_use_failed', { name: 'search_code', arguments: search }), { content: JSON.stringify(answer) }]);

    const first = await step(request(true));
    expect(bodies).toHaveLength(1);
    expect(first.toolCalls).toEqual([{ id: expect.any(String), name: 'search_code', arguments: JSON.stringify(search) }]);

    const second = await step({
      instructions: 'rules',
      input: [{ type: 'tool_result', callId: first.toolCalls[0]!.id, output: 'sqli/dao/student.py:45: await cur.execute(q)' }],
      previousResponseId: first.responseId,
      finalTurn: true,
    });
    expect(JSON.stringify(bodies[1]?.messages)).toContain('TOOL RESULT:\\nsqli/dao/student.py:45');
    expect(second.output).toEqual(answer);
  });

  it('moves on to the final call when a rejected tool turn has nothing to recover', async () => {
    const { step, bodies } = stepWith([rejected('tool_use_failed'), { content: JSON.stringify(answer) }]);

    const result = await step(request(false));

    expect(bodies).toHaveLength(2);
    expect(bodies[1]?.response_format).toMatchObject({ type: 'json_schema' });
    expect(result.output).toEqual(answer);
  });
});

describe('filling empty fields', () => {
  it('adds only null for nullable fields and [] for lists, so a missing reason still fails', () => {
    expect(parseStructured(investigationSchema, [{ ...answerWithoutCodeFix, evidence: undefined }])).toMatchObject({ codeFix: null, evidence: [] });
    const { rating, ...withoutRating } = answer;
    expect(parseStructured(investigationSchema, withoutRating)).toBeUndefined();
    expect(parseStructured(investigationSchema, { ...answer, rating: { ...rating, changeReason: undefined } })).toBeUndefined();
  });

  it('fills empty fields inside list items too', () => {
    const step = { kind: DATA_FLOW_STEP_KIND.SINK, description: 'lodash import' };
    const parsed = parseStructured(investigationSchema, { ...answer, dataFlow: { summary: 's', steps: [step] } });
    expect(parsed?.dataFlow.steps).toEqual([{ ...step, example: null, path: null, line: null }]);
  });
});
