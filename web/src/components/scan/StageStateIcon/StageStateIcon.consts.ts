import { STAGE_STATE, type StageState } from '@scan/shared';

/** Finished states get a solid badge with a white mark, so "done" and "failed" stand out from the rest. */
export const SOLID_STATES: readonly StageState[] = [STAGE_STATE.DONE, STAGE_STATE.FAILED];
export const SOLID_MARK_COLOR = '#ffffff';
