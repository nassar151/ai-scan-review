import { randomUUID } from 'node:crypto';
import {
  PIPELINE_STAGES,
  SCAN_STATUS,
  STAGE_STATE,
  type RepoRef,
  type Scan,
  type ScanResult,
  type ScanStage,
  type ScanStatus,
  type ScanSummary,
  type StageProgress,
} from '@scan/shared';
import type { ScanStore } from '../store/scanStore.types';
import type { ScanListener } from './scanService.types';
import { isTerminalStatus } from './scanStatus';

const now = () => new Date().toISOString();

const updateStage = (
  stages: ScanStage[],
  status: ScanStatus,
  patch: Partial<ScanStage>,
): ScanStage[] => stages.map((stage) => (stage.status === status ? { ...stage, ...patch } : stage));

/** Owns scan state transitions. Every change is persisted, then broadcast to listeners. */
export class ScanService {
  private readonly listeners = new Set<ScanListener>();
  /** Last pending change per scan: changes to one scan run one after another, so none overwrites another. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(private readonly store: ScanStore) {}

  async create(repo: RepoRef): Promise<Scan> {
    const timestamp = now();
    const scan: Scan = {
      id: randomUUID(),
      repo,
      status: SCAN_STATUS.QUEUED,
      stages: PIPELINE_STAGES.map(({ status, label }) => ({ status, label, state: STAGE_STATE.PENDING })),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.store.save(scan);
    this.emit(scan);
    return scan;
  }

  get(id: string): Promise<Scan | undefined> {
    return this.store.get(id);
  }

  list(limit: number): Promise<ScanSummary[]> {
    return this.store.list(limit);
  }

  /** Returns an unsubscribe function. */
  subscribe(listener: ScanListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  updateRepo(id: string, repo: RepoRef): Promise<Scan> {
    return this.mutate(id, (scan) => ({ ...scan, repo }));
  }

  startStage(id: string, status: ScanStatus): Promise<Scan> {
    return this.mutate(id, (scan) => ({
      ...scan,
      status,
      startedAt: scan.startedAt ?? now(),
      stages: updateStage(scan.stages, status, { state: STAGE_STATE.RUNNING, startedAt: now() }),
    }));
  }

  reportStageProgress(id: string, status: ScanStatus, detail: string, progress?: StageProgress): Promise<Scan> {
    return this.mutate(id, (scan) => ({ ...scan, stages: updateStage(scan.stages, status, { detail, ...(progress && { progress }) }) }));
  }

  completeStage(id: string, status: ScanStatus, detail?: string): Promise<Scan> {
    return this.mutate(id, (scan) => ({
      ...scan,
      stages: updateStage(scan.stages, status, {
        state: STAGE_STATE.DONE,
        finishedAt: now(),
        ...(detail ? { detail } : {}),
      }),
    }));
  }

  skipStage(id: string, status: ScanStatus, detail: string): Promise<Scan> {
    return this.mutate(id, (scan) => ({
      ...scan,
      stages: updateStage(scan.stages, status, { state: STAGE_STATE.SKIPPED, detail, finishedAt: now() }),
    }));
  }

  /** Saves the analyzed result before the AI step, so the AI service can read the findings. */
  saveResult(id: string, result: ScanResult): Promise<Scan> {
    return this.mutate(id, (scan) => ({ ...scan, result }));
  }

  /** Re-broadcasts the saved scan after the other service changed it; the result is only loaded once it finished. */
  async refresh(id: string): Promise<void> {
    const state = await this.store.getState(id);
    if (!state) return;
    this.emit(isTerminalStatus(state.status) ? ((await this.store.get(id)) ?? state) : state);
  }

  complete(id: string, result: ScanResult): Promise<Scan> {
    return this.mutate(id, (scan) => ({ ...scan, status: SCAN_STATUS.COMPLETED, finishedAt: now(), result }));
  }

  fail(id: string, message: string): Promise<Scan> {
    return this.mutate(id, (scan) => ({
      ...scan,
      status: SCAN_STATUS.FAILED,
      error: message,
      finishedAt: now(),
      stages: scan.stages.map((stage) =>
        stage.state === STAGE_STATE.RUNNING
          ? { ...stage, state: STAGE_STATE.FAILED, finishedAt: now() }
          : stage,
      ),
    }));
  }

  /**
   * Progress changes read and write only the scan row. The result and findings are written only by the
   * changes that bring a new result (saveResult, complete), so they are not re-saved on every update.
   */
  private mutate(id: string, change: (scan: Scan) => Scan): Promise<Scan> {
    return this.enqueue(id, async () => {
      const current = await this.store.getState(id);
      if (!current) {
        throw new Error(`Scan ${id} not found`);
      }
      const next = { ...change(current), updatedAt: now() };
      await (next.result ? this.store.save(next) : this.store.saveState(next));
      this.emit(next);
      return next;
    });
  }

  private enqueue<T>(id: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const current = previous.then(task);
    const settled = current.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(id, settled);
    void settled.then(() => {
      if (this.queues.get(id) === settled) this.queues.delete(id);
    });
    return current;
  }

  private emit(scan: Scan): void {
    this.listeners.forEach((listener) => {
      try {
        listener(scan);
      } catch (error) {
        console.error('Scan listener failed', error);
      }
    });
  }
}
