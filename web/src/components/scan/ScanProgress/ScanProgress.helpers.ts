import { SCAN_STATUS, STAGE_STATE, type Scan, type ScanStage } from '@scan/shared';
import { PROGRESS_TONE } from '../ScanProgressBar/ScanProgressBar.consts';
import type { ProgressTone } from '../ScanProgressBar/ScanProgressBar.types';
import { PERCENT, RUNNING_STAGE_WEIGHT } from './ScanProgress.consts';

const FINISHED_STATES: readonly string[] = [STAGE_STATE.DONE, STAGE_STATE.SKIPPED, STAGE_STATE.FAILED];

const finishedCount = (stages: ScanStage[]) => stages.filter((stage) => FINISHED_STATES.includes(stage.state)).length;

/** Share of the running stage that is done: its own count when it reports one (findings checked), else half. */
const runningShare = (stage: ScanStage | undefined) => {
  if (!stage) return 0;
  const { progress } = stage;
  return progress && progress.total > 0 ? Math.min(progress.done / progress.total, 1) : RUNNING_STAGE_WEIGHT;
};

/** Finished stages count fully plus the running stage's share, so the line keeps moving during long stages. */
export const progressPercent = (stages: ScanStage[]) => {
  if (stages.length === 0) return 0;
  const running = runningShare(stages.find((stage) => stage.state === STAGE_STATE.RUNNING));
  return Math.round(((finishedCount(stages) + running) / stages.length) * PERCENT);
};

export const progressTone = (scan: Scan): ProgressTone => {
  if (scan.status === SCAN_STATUS.FAILED) return PROGRESS_TONE.FAILED;
  return scan.status === SCAN_STATUS.COMPLETED ? PROGRESS_TONE.DONE : PROGRESS_TONE.RUNNING;
};

/** "3 of 5 steps done · Now: AI investigation", "Failed at Checking dependencies" or "All 5 steps done". */
export const progressCaption = (scan: Scan) => {
  const { stages } = scan;
  const failed = stages.find((stage) => stage.state === STAGE_STATE.FAILED);
  if (failed) return `Failed at ${failed.label}`;
  const done = finishedCount(stages);
  if (done === stages.length) return `All ${stages.length} steps done`;
  const running = stages.find((stage) => stage.state === STAGE_STATE.RUNNING);
  return [`${done} of ${stages.length} steps done`, running && `Now: ${running.label}`].filter(Boolean).join(' · ');
};
