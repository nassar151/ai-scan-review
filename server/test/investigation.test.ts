import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AI_STATUS, DATA_FLOW_STEP_KIND, PRIORITY, REACHABILITY, SEVERITY, type ScanResult } from '@scan/shared';
import type { InvestigationOutput } from '../src/ai-service/investigation/investigation.schema';
import type { AgentStep, AgentStepRequest } from '../src/ai-service/investigation/investigation.types';
import { createInvestigator } from '../src/ai-service/investigation/investigator';
import { createRepoTools } from '../src/ai-service/investigation/repoTools';
import { analyze } from '../src/common/analysis/analyze';
import { buildDependencyScan, buildPackage } from './support/fakeScanOutputs';

const REPO = { owner: 'acme', name: 'shop', url: 'https://github.com/acme/shop' };
const MODEL = 'test-model';
const SEARCH = '_.template(';

const CHANGE_REASON = 'Lowered from high to low: _.template is never called.';
const RISK_SCORE_REASON = 'The only vulnerable API, _.template, is never called.';

const verdict = (overrides: Partial<InvestigationOutput> = {}): InvestigationOutput => ({
  reachability: { status: REACHABILITY.NOT_REACHABLE, explanation: 'lodash is imported but only _.pick is used.' },
  dataFlow: {
    summary: 'No untrusted input reaches _.template; the flow stops at the lodash import.',
    steps: [
      { kind: DATA_FLOW_STEP_KIND.PROPAGATION, description: 'lodash is imported', example: 'key = "sk_live_abcdef123456"', path: 'index.js', line: 1 },
      { kind: DATA_FLOW_STEP_KIND.SINK, description: 'made-up sink', example: "md5('hunter2'.encode('utf-8'))", path: 'src/missing.js', line: 3 },
    ],
  },
  rating: {
    severity: SEVERITY.LOW,
    riskScore: 30,
    severityReason: 'LOW: the only vulnerable API is never called in this repository.',
    changeReason: CHANGE_REASON,
    riskScoreReason: RISK_SCORE_REASON,
  },
  falsePositive: false,
  confidence: 'high',
  verdict: 'lodash.template is never called, so the command injection cannot be triggered.',
  whyItMatters: 'The vulnerable template function is not used anywhere in the app.',
  attackScenario: 'An attacker has no path to the vulnerable function.',
  evidence: [{ note: 'No call to _.template anywhere', path: null, line: null, searchPattern: SEARCH }],
  codeFix: null,
  ...overrides,
});

/** Scripted model: first asks for a search, then answers with `output`. Records every request. */
const scriptedStep = (output: InvestigationOutput, requests: AgentStepRequest[] = []): AgentStep => async (request) => {
  requests.push(request);
  if (!request.previousResponseId) {
    return {
      responseId: 'r1',
      toolCalls: [{ id: 'c1', name: 'search_code', arguments: JSON.stringify({ pattern: SEARCH, isRegex: false, pathPrefix: null }) }],
    };
  }
  return { responseId: 'r2', toolCalls: [], output };
};

const dependencyResult = (): ScanResult =>
  analyze({ repo: REPO, code: undefined, dependencies: buildDependencyScan([buildPackage()]), tools: [], warnings: [] });

describe('repo tools', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'tools-'));
    await fs.mkdir(path.join(root, 'src'));
    await fs.writeFile(path.join(root, 'src', 'app.js'), "const _ = require('lodash');\nres.send(_.escape(name));\n");
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('searches, reads and lists inside the repository', async () => {
    const tools = await createRepoTools(root);
    const search = await tools.execute('search_code', JSON.stringify({ pattern: "require('lodash')", isRegex: false, pathPrefix: null }));
    expect(search.text).toContain("src/app.js:1: const _ = require('lodash');");
    expect(search.log).toEqual({ name: 'search_code', searchPattern: "require('lodash')", matchCount: 1 });

    const regex = await tools.execute('search_code', JSON.stringify({ pattern: '_\\.template\\(', isRegex: true, pathPrefix: 'src/' }));
    expect(regex.text).toBe('No matches for "_\\.template\\(".');
    expect(regex.log.matchCount).toBe(0);

    const read = await tools.execute('read_file', JSON.stringify({ path: '/src/app.js', startLine: 2, endLine: 2 }));
    expect(read.text).toBe('src/app.js (lines 2-2 of 3)\n2| res.send(_.escape(name));');

    expect((await tools.execute('list_files', JSON.stringify({ path: null }))).text).toBe('src/');
  });

  it('refuses paths outside the repository, including through symlinks', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'outside-'));
    await fs.writeFile(path.join(outside, 'secret.txt'), 'top secret');
    await fs.symlink(path.join(outside, 'secret.txt'), path.join(root, 'link.txt'));
    const tools = await createRepoTools(root);

    for (const target of ['../outside/secret.txt', path.join(outside, 'secret.txt'), 'link.txt']) {
      const read = await tools.execute('read_file', JSON.stringify({ path: target, startLine: null, endLine: null }));
      expect(read.text).toMatch(/^Cannot read/);
    }
    expect(await tools.lineCount('link.txt')).toBeUndefined();
    await fs.rm(outside, { recursive: true, force: true });
  });

  it('reports bad arguments and unknown tools to the model instead of throwing', async () => {
    const tools = await createRepoTools(root);
    expect((await tools.execute('read_file', '{"path": 3}')).text).toMatch(/^Invalid arguments/);
    expect((await tools.execute('rm_rf', '{}')).text).toBe('Unknown tool "rm_rf"');
  });
});

describe('investigator', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-'));
    await fs.writeFile(path.join(root, 'index.js'), "const _ = require('lodash');\nmodule.exports = _.pick;\n");
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('re-rates a finding with verified evidence and recomputes priority, grade and the tool log', async () => {
    const requests: AgentStepRequest[] = [];
    const investigate = createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: scriptedStep(verdict(), requests) });
    const before = dependencyResult();
    expect(before.findings[0]?.priority).not.toBe(PRIORITY.MONITOR);

    const result = await investigate({ repo: REPO, repoPath: root, result: before, onProgress: () => {} });
    const [finding] = result.findings;

    expect(requests[1]?.input).toEqual([{ type: 'tool_result', callId: 'c1', output: `No matches for "${SEARCH}".` }]);
    expect(finding).toMatchObject({ severity: SEVERITY.LOW, riskScore: 30, priority: PRIORITY.MONITOR });
    expect(finding?.severityReason).toBe('LOW: the only vulnerable API is never called in this repository.');
    expect(finding?.investigation).toMatchObject({
      reachability: REACHABILITY.NOT_REACHABLE,
      reachabilityExplanation: 'lodash is imported but only _.pick is used.',
      changeReason: CHANGE_REASON,
      riskScoreReason: RISK_SCORE_REASON,
      dataFlow: undefined,
      originalSeverity: before.findings[0]?.severity,
      originalRiskScore: before.findings[0]?.riskScore,
      evidence: [{ note: 'No call to _.template anywhere', searchPattern: SEARCH, matchCount: 0 }],
      toolCalls: 1,
      changeRejected: undefined,
    });
    expect(finding?.riskFactors.at(-1)).toMatch(/^AI investigation: not reachable in this code \(-\d+\)$/);
    expect(result.grade).toBe('A');
    expect(result.ai).toMatchObject({ status: AI_STATUS.COMPLETED, investigated: 1, changed: 1, failed: 0 });
  });

  it('keeps the scanner rating when the evidence cannot be verified', async () => {
    const invented = verdict({
      dataFlow: { summary: 'Invented flow', steps: [{ kind: DATA_FLOW_STEP_KIND.SINK, description: 'made-up sink', example: null, path: 'src/missing.js', line: 3 }] },
      evidence: [
        { note: 'made up file', path: 'src/missing.js', line: 4, searchPattern: null },
        { note: 'line past the end', path: 'index.js', line: 99, searchPattern: null },
        { note: 'search never run', path: null, line: null, searchPattern: 'lodash.template' },
      ],
    });
    const investigate = createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: scriptedStep(invented) });
    const before = dependencyResult();

    const [finding] = (await investigate({ repo: REPO, repoPath: root, result: before, onProgress: () => {} })).findings;

    expect(finding).toMatchObject({ severity: before.findings[0]?.severity, riskScore: before.findings[0]?.riskScore });
    expect(finding?.investigation?.evidence).toEqual([]);
    expect(finding?.investigation?.changeRejected).toMatch(/without verifiable evidence/);
    expect(finding?.investigation?.changeReason).toBeUndefined();
  });

  it('keeps a real file and line even when the item also names a search that was never run', async () => {
    const output = verdict({ evidence: [{ note: 'lodash import', path: 'index.js', line: 1, searchPattern: 'never-run pattern' }] });
    const investigate = createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: scriptedStep(output) });
    const before = dependencyResult();

    const [finding] = (await investigate({ repo: REPO, repoPath: root, result: before, onProgress: () => {} })).findings;

    expect(finding?.investigation?.evidence).toEqual([{ note: 'lodash import', path: 'index.js', line: 1 }]);
    expect(finding?.investigation?.reachability).toBe(REACHABILITY.NOT_REACHABLE);
    expect(finding?.severity).toBe(SEVERITY.LOW);
  });

  it('marks "not reachable" as unclear when none of its evidence can be verified', async () => {
    const output = verdict({ evidence: [{ note: 'search never run', path: null, line: null, searchPattern: 'routes/admin' }] });
    const investigate = createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: scriptedStep(output) });

    const [finding] = (await investigate({ repo: REPO, repoPath: root, result: dependencyResult(), onProgress: () => {} })).findings;

    expect(finding?.investigation?.reachability).toBe(REACHABILITY.UNKNOWN);
    expect(finding?.investigation?.reachabilityExplanation).toMatch(/none of its evidence could be verified/);
  });

  it('marks "reachable" as unclear unless the attack path ends at a real sink', async () => {
    const reachabilityFor = async (sinkPath: string) => {
      const output = verdict({
        reachability: { status: REACHABILITY.REACHABLE, explanation: 'POST /preview passes the body to _.template.' },
        dataFlow: {
          summary: 'body -> _.template',
          steps: [{ kind: DATA_FLOW_STEP_KIND.SINK, description: '_.template call', example: 'key = "sk_live_abcdef123456"', path: sinkPath, line: 1 }],
        },
      });
      const investigate = createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: scriptedStep(output) });
      const [finding] = (await investigate({ repo: REPO, repoPath: root, result: dependencyResult(), onProgress: () => {} })).findings;
      return finding?.investigation;
    };

    const verified = await reachabilityFor('index.js');
    expect(verified?.reachability).toBe(REACHABILITY.REACHABLE);
    expect(verified?.dataFlow?.steps[0]?.example).toBe('key = "sk_l************"');
    const unverified = await reachabilityFor('src/missing.js');
    expect(unverified?.reachability).toBe(REACHABILITY.UNKNOWN);
    expect(unverified?.reachabilityExplanation).toMatch(/reachability is unclear/);
    expect(unverified?.dataFlow).toBeUndefined();
  });

  it('keeps the scanner rating when the risk score changes without a reason for it', async () => {
    const run = (riskScore: number, riskScoreReason: string) =>
      createInvestigator({
        apiKey: '',
        model: MODEL,
        timeoutMs: 1000,
        step: scriptedStep(verdict({ rating: { severity: SEVERITY.HIGH, riskScore, severityReason: 'HIGH: reachable.', changeReason: 'Kept at high: the vulnerable code is reachable.', riskScoreReason } })),
      })({ repo: REPO, repoPath: root, result: dependencyResult(), onProgress: () => {} });

    const unexplained = (await run(60, '')).findings[0];
    expect(unexplained?.riskScore).toBe(77);
    expect(unexplained?.investigation?.changeRejected).toBe(
      'The agent changed the risk score from 77 to 60 without explaining why, so the scanner rating was kept.',
    );

    const explained = (await run(60, 'Only an internal admin route reaches it.')).findings[0];
    expect(explained?.riskScore).toBe(60);
    expect(explained?.investigation).toMatchObject({ riskScoreReason: 'Only an internal admin route reaches it.', changeRejected: undefined });
  });

  it('investigates every finding, monitor ones included, most urgent first', async () => {
    const before = analyze({
      repo: REPO,
      code: undefined,
      dependencies: buildDependencyScan([buildPackage(), buildPackage({ name: 'left-pad', version: '1.0.0', isDev: true })]),
      tools: [],
      warnings: [],
    });
    expect(before.findings.some((finding) => finding.priority === PRIORITY.MONITOR)).toBe(true);
    const result = await createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: scriptedStep(verdict()) })({
      repo: REPO, repoPath: root, result: before, onProgress: () => {},
    });

    expect(result.findings.every((finding) => finding.investigation !== undefined)).toBe(true);
    expect(result.ai.investigated).toBe(before.findings.length);
  });

  it('keeps a suggested code fix only for a real line range, with the original code read from the repo', async () => {
    const fix = { path: '/index.js', startLine: 2, endLine: 2, fixedCode: 'module.exports = { pick: _.pick };\n', explanation: 'Export only what is needed.' };
    const run = (codeFix: InvestigationOutput['codeFix']) =>
      createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: scriptedStep(verdict({ codeFix })) })({
        repo: REPO, repoPath: root, result: dependencyResult(), onProgress: () => {},
      });

    expect((await run(fix)).findings[0]?.investigation?.codeFix).toEqual({
      path: 'index.js',
      startLine: 2,
      endLine: 2,
      originalCode: 'module.exports = _.pick;',
      fixedCode: 'module.exports = { pick: _.pick };',
      explanation: 'Export only what is needed.',
    });
    expect((await run({ ...fix, endLine: 99 })).findings[0]?.investigation?.codeFix).toBeUndefined();
    expect((await run({ ...fix, fixedCode: 'module.exports = _.pick;' })).findings[0]?.investigation?.codeFix).toBeUndefined();
  });

  it('keeps the deterministic finding when the agent fails, and reports when no key is set', async () => {
    const failing: AgentStep = async () => {
      throw new Error('rate limited');
    };
    const before = dependencyResult();
    const failed = await createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000, step: failing })({
      repo: REPO, repoPath: root, result: before, onProgress: () => {},
    });
    expect(failed.findings).toEqual(before.findings);
    expect(failed.ai).toMatchObject({ status: AI_STATUS.FAILED, failed: 1 });

    const off = await createInvestigator({ apiKey: '', model: MODEL, timeoutMs: 1000 })({
      repo: REPO, repoPath: root, result: before, onProgress: () => {},
    });
    expect(off.ai.status).toBe(AI_STATUS.UNAVAILABLE);
  });
});
