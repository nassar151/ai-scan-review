import type { Scan, ScanSummary } from '@scan/shared';

/** Persistence port for scans. */
export interface ScanStore {
  /** Inserts or replaces the scan, including its result and findings when present. */
  save(scan: Scan): Promise<void>;
  /** Writes only the scan row (status, stages, repo); a saved result and its findings are left untouched. */
  saveState(scan: Scan): Promise<void>;
  get(id: string): Promise<Scan | undefined>;
  /** Reads only the scan row, without the result and findings. */
  getState(id: string): Promise<Scan | undefined>;
  list(limit: number): Promise<ScanSummary[]>;
  /** Fails scans left mid-run by a previous process; returns how many were updated. */
  failInterrupted(message: string): Promise<number>;
}
