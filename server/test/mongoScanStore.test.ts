import { describe, expect, it } from 'vitest';
import { SCAN_STATUS, STAGE_STATE, type Scan } from '@scan/shared';
import { analyze } from '../src/common/analysis/analyze';
import { COLLECTION } from '../src/common/db/database.consts';
import { MongoScanStore } from '../src/common/store/mongoScanStore';
import { buildCodeScan, buildDependencyScan } from './support/fakeScanOutputs';
import { createTestDatabase } from './support/testDatabase';

const NOW = '2026-11-22T21:00:00.000Z';
const REPO = { owner: 'acme', name: 'shop', url: 'https://github.com/acme/shop' };

const buildScan = (overrides: Partial<Scan> = {}): Scan => ({
  id: 'scan-1',
  repo: REPO,
  status: SCAN_STATUS.SCANNING_CODE,
  stages: [
    { status: SCAN_STATUS.CLONING, label: 'Fetching repository', state: STAGE_STATE.DONE },
    { status: SCAN_STATUS.SCANNING_CODE, label: 'Scanning source code', state: STAGE_STATE.RUNNING },
  ],
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const analyzed = () => analyze({ repo: REPO, code: buildCodeScan(), dependencies: buildDependencyScan(), tools: [], warnings: ['w'] });

const createStore = async () => {
  const { db } = await createTestDatabase();
  return { db, store: new MongoScanStore(db) };
};

describe('MongoScanStore', () => {
  it('round-trips a scan with its result, findings and advisories', async () => {
    const { store } = await createStore();
    const result = analyzed();
    const scan = buildScan({ status: SCAN_STATUS.COMPLETED, result });

    await store.save(scan);

    expect(await store.get(scan.id)).toEqual(scan);
    expect((await store.list(10))[0]).toMatchObject({ id: scan.id, grade: result.grade });
  });

  it('replaces the findings when the result is saved again, removing the old ones', async () => {
    const { db, store } = await createStore();
    const result = analyzed();
    await store.save(buildScan({ result }));

    const reRated = { ...result, findings: result.findings.slice(0, 1) };
    await store.save(buildScan({ status: SCAN_STATUS.COMPLETED, result: reRated }));

    expect((await store.get('scan-1'))?.result?.findings).toEqual(reRated.findings);
    expect(await db.collection(COLLECTION.FINDINGS).countDocuments({ scanId: 'scan-1' })).toBe(1);
  });

  it('reads and writes only the scan document for progress, keeping the saved findings', async () => {
    const { store } = await createStore();
    const result = analyzed();
    await store.save(buildScan({ status: SCAN_STATUS.INVESTIGATING, result }));

    const state = await store.getState('scan-1');
    expect(state?.result).toBeUndefined();
    await store.saveState({ ...state!, stages: [], updatedAt: '2026-11-22T21:05:00.000Z' });

    const saved = await store.get('scan-1');
    expect(saved?.stages).toEqual([]);
    expect(saved?.result?.findings).toEqual(result.findings);
  });

  it('finds every scan that has a given CVE with one query', async () => {
    const { db, store } = await createStore();
    const result = analyzed();
    await store.save(buildScan({ status: SCAN_STATUS.COMPLETED, result }));
    const cve = result.findings.flatMap((finding) => finding.dependency?.advisories.flatMap((advisory) => advisory.cveIds) ?? [])[0];

    const scanIds = await db.collection(COLLECTION.FINDINGS).distinct('scanId', { 'dependency.advisories.cveIds': cve });

    expect(cve).toBeDefined();
    expect(scanIds).toEqual(['scan-1']);
  });

  it('fails scans interrupted by a restart', async () => {
    const { store } = await createStore();
    await store.save(buildScan());

    expect(await store.failInterrupted('Interrupted by server restart')).toBe(1);
    const scan = await store.get('scan-1');
    expect(scan?.status).toBe(SCAN_STATUS.FAILED);
    expect(scan?.stages[1]?.state).toBe(STAGE_STATE.FAILED);
    expect(scan?.error).toBe('Interrupted by server restart');
  });
});
