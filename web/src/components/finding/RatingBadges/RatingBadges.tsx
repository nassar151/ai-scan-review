import { Typography } from '@forgedevstack/bear';
import { RISK_SCORE_MAX } from '@scan/shared';
import { PriorityBadge } from '../../common/PriorityBadge/PriorityBadge';
import { SeverityBadge } from '../../common/SeverityBadge/SeverityBadge';
import type { RatingBadgesProps } from './RatingBadges.types';

export const RatingBadges = ({ severity, riskScore, priority, muted = false }: RatingBadgesProps) => (
  <span className={`bear-inline-flex bear-flex-wrap bear-items-center bear-gap-2 ${muted ? 'bear-opacity-60' : ''}`}>
    <SeverityBadge severity={severity} />
    <Typography variant="body2" weight="bold" component="span" className="bear-font-mono">
      {riskScore}/{RISK_SCORE_MAX}
    </Typography>
    <PriorityBadge priority={priority} />
  </span>
);
