import { SEVERITY_META } from '../../../theme/display.consts';
import { tintedStyle } from '../../../theme/display.helpers';
import { SEVERITY_SCORE_DIGITS } from './SeverityBadge.consts';
import type { SeverityBadgeProps } from './SeverityBadge.types';

export const SeverityBadge = ({ severity, score }: SeverityBadgeProps) => {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className="bear-inline-flex bear-items-center bear-gap-1 bear-rounded-full bear-border bear-px-2 bear-py-0.5 bear-text-xs bear-font-semibold bear-whitespace-nowrap"
      style={tintedStyle(meta.color)}
    >
      {meta.label}
      {score !== undefined && <span className="bear-font-mono">{score.toFixed(SEVERITY_SCORE_DIGITS)}</span>}
    </span>
  );
};
