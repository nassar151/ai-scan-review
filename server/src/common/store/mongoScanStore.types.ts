import type { Finding, RepoRef, ScanResult, ScanStage } from '@scan/shared';

/** The scan's result without its findings, plus which saved set of findings belongs to it. */
export type StoredResult = Omit<ScanResult, 'findings'> & { findingsVersion: string };

export interface ScanDocument {
  _id: string;
  repo: RepoRef;
  status: string;
  stages: ScanStage[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  /** Missing until the scan is analyzed. */
  result?: StoredResult;
}

/** One finding per document, so a finding can be queried across scans and repos. */
export type FindingDocument = Finding & {
  scanId: string;
  version: string;
  position: number;
};
