import { Typography } from '@forgedevstack/bear';
import { STAGE_STATE } from '@scan/shared';
import { useState } from 'react';
import { PIPELINE_STATE_META, STAGE_EXPLANATION, STAGE_STATE_LABEL } from '../../../theme/display.consts';
import { tintedStyle } from '../../../theme/display.helpers';
import { durationBetween } from '../../../utils/format';
import type { PipelineStageNodeProps } from './PipelineStageNode.types';

/** One pipeline job: name and duration; the detail opens on click. */
export const PipelineStageNode = ({ stage }: PipelineStageNodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const meta = PIPELINE_STATE_META[stage.state];
  const detail = stage.detail ?? STAGE_EXPLANATION[stage.status];

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={() => setIsOpen((open) => !open)}
      className="bear-flex bear-flex-1 bear-self-stretch bear-items-start bear-gap-2 bear-min-w-0 bear-rounded-md bear-border bear-bg-white bear-px-3 bear-py-2 bear-text-left bear-cursor-pointer hover:bear-bg-primary-50"
    >
      <span
        aria-label={STAGE_STATE_LABEL[stage.state]}
        className={`bear-flex bear-h-7 bear-w-7 bear-shrink-0 bear-items-center bear-justify-center bear-rounded-full bear-border bear-font-bold bear-text-sm ${
          stage.state === STAGE_STATE.RUNNING ? 'bear-animate-pulse' : ''
        }`}
        style={tintedStyle(meta.color)}
      >
        {meta.icon}
      </span>
      <span className="bear-flex bear-flex-col bear-min-w-0">
        <Typography variant="body2" weight="semibold" maxLines={1} component="span">
          {stage.label}
        </Typography>
        <Typography variant="caption" color="muted" className="bear-font-mono" component="span">
          {durationBetween(stage.startedAt, stage.finishedAt) ?? STAGE_STATE_LABEL[stage.state]}
        </Typography>
        {isOpen && detail && (
          <Typography variant="caption" color="muted" component="span" className="bear-mt-1">
            {detail}
          </Typography>
        )}
      </span>
    </button>
  );
};
