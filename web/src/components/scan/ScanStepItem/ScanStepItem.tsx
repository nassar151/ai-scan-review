import { Typography } from '@forgedevstack/bear';
import { STAGE_STATE } from '@scan/shared';
import { PIPELINE_STATE_META, STAGE_EXPLANATION } from '../../../theme/display.consts';
import { StageStateIcon } from '../StageStateIcon/StageStateIcon';
import { stageStatusText } from './ScanStepItem.helpers';
import type { ScanStepItemProps } from './ScanStepItem.types';

/** One stage of the running scan: state badge, name, live status and what it found or is doing. */
export const ScanStepItem = ({ stage, now, isLast }: ScanStepItemProps) => {
  const { color } = PIPELINE_STATE_META[stage.state];
  const isPending = stage.state === STAGE_STATE.PENDING;

  return (
    <li className="bear-flex bear-gap-3">
      <div className="bear-flex bear-flex-col bear-items-center">
        <StageStateIcon state={stage.state} />
        {!isLast && <span aria-hidden className="bear-w-0.5 bear-flex-1 bear-my-1 bear-rounded-full" style={{ backgroundColor: color }} />}
      </div>
      <div className={`bear-flex bear-flex-col bear-gap-0.5 bear-min-w-0 ${isLast ? '' : 'bear-pb-5'}`}>
        <div className="bear-flex bear-flex-wrap bear-items-baseline bear-gap-x-3">
          <Typography variant="body1" weight="semibold" color={isPending ? 'muted' : undefined} component="span">
            {stage.label}
          </Typography>
          <Typography variant="caption" weight="semibold" color={color} className="bear-font-mono" component="span">
            {stageStatusText(stage, now)}
          </Typography>
        </div>
        <Typography variant="body2" color="muted" component="span">
          {stage.detail ?? STAGE_EXPLANATION[stage.status]}
        </Typography>
      </div>
    </li>
  );
};
