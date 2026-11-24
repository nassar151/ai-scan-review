import type { RepoRef, ScanResult, ScanStatus, StageProgress, ToolRun } from '@scan/shared';
import type { CodeScanOutput, DependencyScanOutput } from '../../common/analysis/analysis.types';

/** Data handed from one stage to the next. */
export interface PipelineArtifacts {
  repoPath?: string;
  codeScan?: CodeScanOutput;
  dependencyScan?: DependencyScanOutput;
  tools: ToolRun[];
  warnings: string[];
  result?: ScanResult;
}

export interface PipelineContext {
  readonly scanId: string;
  readonly repo: RepoRef;
  readonly artifacts: PipelineArtifacts;
  /** Persists repository details learned during the scan (default branch, commit). */
  updateRepo(repo: RepoRef): void;
  /** Live progress note for the running stage, shown in the UI. */
  reportProgress(detail: string, progress?: StageProgress): void;
  /** Registers work that must run when the scan ends, success or failure (e.g. delete clone). */
  onCleanup(task: () => Promise<void>): void;
}

export interface StageOutcome {
  /** Final note shown under the stage, e.g. "Found 412 dependencies". */
  detail?: string;
  skipped?: boolean;
}

export interface PipelineStage {
  status: ScanStatus;
  run(context: PipelineContext): Promise<StageOutcome>;
}

/** Hands a scan to the AI service. Resolves once the AI service has accepted it, not when it finishes. */
export interface InvestigationClient {
  start(scanId: string): Promise<void>;
}
