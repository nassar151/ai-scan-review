import { STAGE_STATE, type ScanStage } from '@scan/shared';
import { STAGE_STATE_LABEL } from '../../../theme/display.consts';
import { durationBetween, formatDuration } from '../../../utils/format';

/** "Done in 26s", "In progress · 1m 12s" or "Waiting". */
export const stageStatusText = (stage: ScanStage, now: number) => {
  const label = STAGE_STATE_LABEL[stage.state];
  if (stage.state === STAGE_STATE.RUNNING && stage.startedAt) {
    return `${label} · ${formatDuration(now - Date.parse(stage.startedAt))}`;
  }
  const duration = durationBetween(stage.startedAt, stage.finishedAt);
  return duration ? `${label} in ${duration}` : label;
};
