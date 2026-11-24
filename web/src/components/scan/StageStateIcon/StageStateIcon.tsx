import { Spinner } from '@forgedevstack/bear';
import { STAGE_STATE } from '@scan/shared';
import { PIPELINE_STATE_META, STAGE_STATE_LABEL } from '../../../theme/display.consts';
import { tintedStyle } from '../../../theme/display.helpers';
import { SOLID_MARK_COLOR, SOLID_STATES } from './StageStateIcon.consts';
import type { StageStateIconProps } from './StageStateIcon.types';

export const StageStateIcon = ({ state }: StageStateIconProps) => {
  const { icon, color } = PIPELINE_STATE_META[state];
  const style = SOLID_STATES.includes(state) ? { backgroundColor: color, borderColor: color, color: SOLID_MARK_COLOR } : tintedStyle(color);

  return (
    <span
      role="img"
      aria-label={STAGE_STATE_LABEL[state]}
      className="bear-flex bear-h-8 bear-w-8 bear-shrink-0 bear-items-center bear-justify-center bear-rounded-full bear-border bear-font-bold bear-text-sm"
      style={style}
    >
      {state === STAGE_STATE.RUNNING ? <Spinner size="sm" color={color} label={STAGE_STATE_LABEL[state]} /> : icon}
    </span>
  );
};
