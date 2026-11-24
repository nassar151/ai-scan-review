import { randomUUID } from 'node:crypto';
import type { Collection, Db } from 'mongodb';
import {
  SCAN_STATUS,
  STAGE_STATE,
  TERMINAL_SCAN_STATUSES,
  type Finding,
  type Scan,
  type ScanStatus,
  type ScanSummary,
} from '@scan/shared';
import { COLLECTION } from '../db/database.consts';
import type { FindingDocument, ScanDocument } from './mongoScanStore.types';
import type { ScanStore } from './scanStore.types';

const OPTIONAL_STATE_FIELDS = ['error', 'startedAt', 'finishedAt'] as const;
const WITHOUT_RESULT = { projection: { result: 0 } };
const FINDING_ONLY = { projection: { _id: 0, scanId: 0, version: 0, position: 0 } };
const SUMMARY_FIELDS = {
  repo: 1,
  status: 1,
  error: 1,
  createdAt: 1,
  finishedAt: 1,
  'result.grade': 1,
  'result.severityCounts': 1,
};

const toDate = (value: string | undefined) => (value === undefined ? undefined : new Date(value));
const toIso = (value: Date | undefined) => value?.toISOString();

const toScan = (doc: ScanDocument): Scan => ({
  id: doc._id,
  repo: doc.repo,
  status: doc.status as ScanStatus,
  stages: doc.stages,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  startedAt: toIso(doc.startedAt),
  finishedAt: toIso(doc.finishedAt),
  error: doc.error,
});

/** $set for the scan's own fields, and $unset for optional ones that are no longer set. */
const stateUpdate = (scan: Scan) => {
  const state = {
    repo: scan.repo,
    status: scan.status,
    stages: scan.stages,
    error: scan.error,
    createdAt: new Date(scan.createdAt),
    updatedAt: new Date(scan.updatedAt),
    startedAt: toDate(scan.startedAt),
    finishedAt: toDate(scan.finishedAt),
  };
  const cleared = OPTIONAL_STATE_FIELDS.filter((field) => state[field] === undefined);
  return { state, unset: Object.fromEntries(cleared.map((field) => [field, true as const])) };
};

export class MongoScanStore implements ScanStore {
  private readonly scans: Collection<ScanDocument>;
  private readonly findings: Collection<FindingDocument>;

  constructor(db: Db) {
    this.scans = db.collection<ScanDocument>(COLLECTION.SCANS);
    this.findings = db.collection<FindingDocument>(COLLECTION.FINDINGS);
  }

  /**
   * Findings are written under a new version first, then the scan switches to that version in one update, then
   * older versions are removed. A reader sees either the old result or the new one, never a half-written set.
   */
  async save(scan: Scan): Promise<void> {
    if (!scan.result) return this.saveState(scan);
    const { findings, ...summary } = scan.result;
    const version = randomUUID();
    if (findings.length > 0) {
      await this.findings.insertMany(findings.map((finding, position) => ({ ...finding, scanId: scan.id, version, position })));
    }
    const { state, unset } = stateUpdate(scan);
    await this.scans.updateOne(
      { _id: scan.id },
      { $set: { ...state, result: { ...summary, findingsVersion: version } }, $unset: unset },
      { upsert: true },
    );
    await this.findings.deleteMany({ scanId: scan.id, version: { $ne: version } });
  }

  async saveState(scan: Scan): Promise<void> {
    const { state, unset } = stateUpdate(scan);
    await this.scans.updateOne({ _id: scan.id }, { $set: state, $unset: unset }, { upsert: true });
  }

  async getState(id: string): Promise<Scan | undefined> {
    const doc = await this.scans.findOne({ _id: id }, WITHOUT_RESULT);
    return doc ? toScan(doc) : undefined;
  }

  async get(id: string): Promise<Scan | undefined> {
    const doc = await this.scans.findOne({ _id: id });
    if (!doc) return undefined;
    if (!doc.result) return toScan(doc);
    const { findingsVersion, ...summary } = doc.result;
    const findings = await this.findings
      .find<Finding>({ scanId: id, version: findingsVersion }, FINDING_ONLY)
      .sort({ position: 1 })
      .toArray();
    return { ...toScan(doc), result: { ...summary, findings } };
  }

  async list(limit: number): Promise<ScanSummary[]> {
    const docs = await this.scans
      .find<Pick<ScanDocument, '_id' | 'repo' | 'status' | 'error' | 'createdAt' | 'finishedAt' | 'result'>>({}, { projection: SUMMARY_FIELDS })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map((doc) => {
      const isCompleted = doc.status === SCAN_STATUS.COMPLETED;
      return {
        id: doc._id,
        repo: doc.repo,
        status: doc.status as ScanStatus,
        createdAt: doc.createdAt.toISOString(),
        finishedAt: toIso(doc.finishedAt),
        error: doc.error,
        grade: isCompleted ? doc.result?.grade : undefined,
        severityCounts: isCompleted ? doc.result?.severityCounts : undefined,
      };
    });
  }

  async failInterrupted(message: string): Promise<number> {
    const docs = await this.scans.find({ status: { $nin: [...TERMINAL_SCAN_STATUSES] } }, WITHOUT_RESULT).toArray();
    const now = new Date().toISOString();

    for (const scan of docs.map(toScan)) {
      await this.saveState({
        ...scan,
        status: SCAN_STATUS.FAILED,
        error: message,
        updatedAt: now,
        finishedAt: now,
        stages: scan.stages.map((stage) =>
          stage.state === STAGE_STATE.RUNNING ? { ...stage, state: STAGE_STATE.FAILED, finishedAt: now } : stage,
        ),
      });
    }
    return docs.length;
  }
}
