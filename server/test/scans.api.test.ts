import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AI_STATUS, SCAN_STATUS, STAGE_STATE, type Scan } from '@scan/shared';
import type { Investigator } from '../src/ai-service/investigation/investigator';
import { createAiApp } from '../src/ai-service/service/aiApp';
import { InvestigationRunner } from '../src/ai-service/service/investigationRunner';
import { ScanService } from '../src/common/scans/scanService';
import { MongoScanStore } from '../src/common/store/mongoScanStore';
import { createApp } from '../src/scan-service/app';
import type { InvestigationClient, PipelineStage } from '../src/scan-service/pipeline/pipeline.types';
import { ScanRunner } from '../src/scan-service/pipeline/scanRunner';
import { createMockStages } from './support/mockStages';
import { createTestDatabase } from './support/testDatabase';

const REPO_URL = 'https://github.com/expressjs/express';
const FAST_STAGE_DELAY_MS = 20;
const UNUSED_REPOS_DIR = path.join(os.tmpdir(), 'ai-scan-test-repos');
const passThroughInvestigator: Investigator = async ({ result }) => result;

/** Both services on one in-memory MongoDB; the HTTP hop between them is replaced by a direct call. */
const setup = async (
  stages: PipelineStage[] = createMockStages(FAST_STAGE_DELAY_MS),
  client?: InvestigationClient,
) => {
  const scans = new ScanService(new MongoScanStore((await createTestDatabase()).db));
  const investigations = new InvestigationRunner(scans, passThroughInvestigator, UNUSED_REPOS_DIR);
  const inProcessClient: InvestigationClient = {
    start: async (scanId) => {
      void investigations.run(scanId);
    },
  };
  const runner = new ScanRunner(scans, stages, client ?? inProcessClient);
  return { app: createApp({ scans, runner }), aiApp: createAiApp({ scans, runner: investigations }), scans };
};

const waitForStatus = async (app: Awaited<ReturnType<typeof setup>>['app'], id: string, status: string) =>
  vi.waitFor(async () => {
    const { body } = await request(app).get(`/api/scans/${id}`);
    expect(body.status).toBe(status);
    return body as Scan;
  });

describe('Scans API', () => {
  it('starts a scan, reports every stage, and returns the result', async () => {
    const { app, scans } = await setup();
    const seenStatuses = new Set<string>();
    scans.subscribe((scan) => seenStatuses.add(scan.status));

    const created = await request(app).post('/api/scans').send({ repoUrl: `${REPO_URL}.git` });

    expect(created.status).toBe(202);
    expect(created.headers.location).toBe(`/api/scans/${created.body.id}`);
    expect(created.body.repo.url).toBe(REPO_URL);
    expect(created.body.status).toBe(SCAN_STATUS.QUEUED);

    const done = await waitForStatus(app, created.body.id, SCAN_STATUS.COMPLETED);

    expect(done.stages.every((stage) => stage.state === STAGE_STATE.DONE)).toBe(true);
    expect(done.repo.commitSha).toBe('abc1234def');
    expect(done.result?.findings.length).toBe(2);
    expect([...seenStatuses]).toEqual([
      SCAN_STATUS.QUEUED,
      SCAN_STATUS.CLONING,
      SCAN_STATUS.SCANNING_CODE,
      SCAN_STATUS.SCANNING_DEPENDENCIES,
      SCAN_STATUS.ANALYZING,
      SCAN_STATUS.INVESTIGATING,
      SCAN_STATUS.COMPLETED,
    ]);

    const list = await request(app).get('/api/scans');
    expect(list.body[0]).toMatchObject({ id: done.id, grade: done.result?.grade });
  });

  it('marks the scan failed and the running stage failed when a stage throws', async () => {
    const [cloning, scanningCode] = createMockStages(FAST_STAGE_DELAY_MS);
    const brokenStage: PipelineStage = {
      status: SCAN_STATUS.SCANNING_DEPENDENCIES,
      run: async () => {
        throw new Error('osv-scanner crashed');
      },
    };
    const { app } = await setup([cloning!, scanningCode!, brokenStage]);

    const created = await request(app).post('/api/scans').send({ repoUrl: REPO_URL });
    const failed = await waitForStatus(app, created.body.id, SCAN_STATUS.FAILED);

    expect(failed.error).toBe('osv-scanner crashed');
    expect(failed.stages.find((stage) => stage.status === SCAN_STATUS.SCANNING_DEPENDENCIES)?.state).toBe(
      STAGE_STATE.FAILED,
    );
  });

  it('streams progress as server-sent events until the scan finishes', async () => {
    const { app } = await setup();
    const created = await request(app).post('/api/scans').send({ repoUrl: REPO_URL });

    const stream = await request(app)
      .get(`/api/scans/${created.body.id}/events`)
      .buffer(true)
      .parse((res, callback) => {
        let text = '';
        res.on('data', (chunk: Buffer) => (text += chunk.toString()));
        res.on('end', () => callback(null, text));
      });

    expect(stream.headers['content-type']).toContain('text/event-stream');
    const events = (stream.body as string)
      .split('\n\n')
      .filter((block) => block.startsWith('data: '))
      .map((block) => JSON.parse(block.slice('data: '.length)) as { type: string; scan: Scan });
    expect(events[0]?.type).toBe('snapshot');
    expect(events.at(-1)?.scan.status).toBe(SCAN_STATUS.COMPLETED);
    expect(new Set(events.map((event) => event.scan.status)).size).toBeGreaterThanOrEqual(4);
    expect(events.slice(0, -1).every((event) => event.scan.result === undefined)).toBe(true);
    expect(events.at(-1)?.scan.result?.findings.length).toBe(2);
  });

  it('finishes without AI when the AI service cannot be reached', async () => {
    const unreachable: InvestigationClient = {
      start: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    };
    const { app } = await setup(undefined, unreachable);

    const created = await request(app).post('/api/scans').send({ repoUrl: REPO_URL });
    const done = await waitForStatus(app, created.body.id, SCAN_STATUS.COMPLETED);

    expect(done.result?.ai.status).toBe(AI_STATUS.FAILED);
    expect(done.result?.findings.length).toBe(2);
    expect(done.stages.find((stage) => stage.status === SCAN_STATUS.INVESTIGATING)?.state).toBe(STAGE_STATE.SKIPPED);
  });

  it('pushes changes made by the AI service when it calls the internal route', async () => {
    const { app, scans } = await setup();
    const created = await request(app).post('/api/scans').send({ repoUrl: REPO_URL });
    await waitForStatus(app, created.body.id, SCAN_STATUS.COMPLETED);
    const pushed = vi.fn();
    scans.subscribe(pushed);

    const notified = await request(app).post(`/internal/scans/${created.body.id}/changed`);

    expect(notified.status).toBe(204);
    expect(pushed).toHaveBeenCalledWith(expect.objectContaining({ id: created.body.id }));
  });

  it('AI service accepts only analyzed scans', async () => {
    const { aiApp } = await setup();

    const invalid = await request(aiApp).post('/investigations').send({ scanId: 'not-a-uuid' });
    expect(invalid.status).toBe(400);

    const unknown = await request(aiApp).post('/investigations').send({ scanId: '6f1c1f43-5a3b-4f43-9a51-6a2a3b4c5d6e' });
    expect(unknown.status).toBe(404);
  });

  it('validates input', async () => {
    const { app } = await setup();

    const missing = await request(app).post('/api/scans').send({});
    expect(missing.status).toBe(400);

    const wrongHost = await request(app).post('/api/scans').send({ repoUrl: 'https://gitlab.com/a/b' });
    expect(wrongHost.status).toBe(400);
    expect(wrongHost.body.error).toBe('Invalid GitHub repository URL');

    const unknown = await request(app).get('/api/scans/does-not-exist');
    expect(unknown.status).toBe(404);
  });
});
