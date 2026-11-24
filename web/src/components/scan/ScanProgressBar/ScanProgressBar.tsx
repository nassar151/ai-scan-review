import { Typography } from '@forgedevstack/bear';
import { PERCENT } from '../ScanProgress/ScanProgress.consts';
import { PROGRESS_TONE_META, PROGRESS_TRACK_COLOR } from './ScanProgressBar.consts';
import { fillStyle } from './ScanProgressBar.helpers';
import type { ScanProgressBarProps } from './ScanProgressBar.types';

/** Big percentage and a gradient line that fills as the stages finish; the colours flow while it runs. */
export const ScanProgressBar = ({ percent, tone, caption }: ScanProgressBarProps) => (
  <div className="bear-flex bear-flex-col bear-gap-2">
    <div className="bear-flex bear-items-end bear-justify-between bear-gap-3">
      <Typography variant="h4" weight="bold" color={PROGRESS_TONE_META[tone].color} className="bear-font-mono bear-tabular-nums">
        {percent}%
      </Typography>
      <Typography variant="body2" color="muted" className="bear-text-right">
        {caption}
      </Typography>
    </div>
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={PERCENT}
      className="bear-relative bear-h-3 bear-w-full bear-overflow-hidden bear-rounded-full"
      style={{ backgroundColor: PROGRESS_TRACK_COLOR }}
    >
      <div className="bear-h-full bear-rounded-full" style={fillStyle(tone, percent)} />
    </div>
  </div>
);
