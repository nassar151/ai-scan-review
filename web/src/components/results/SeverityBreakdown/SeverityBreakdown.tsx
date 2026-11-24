import { Typography } from '@forgedevstack/bear';
import { SEVERITY_ORDER } from '@scan/shared';
import { SEVERITY_META } from '../../../theme/display.consts';
import { tintedStyle } from '../../../theme/display.helpers';
import type { SeverityBreakdownProps } from './SeverityBreakdown.types';

/** One panel per severity, filled with that severity's colour. */
export const SeverityBreakdown = ({ result }: SeverityBreakdownProps) => (
  <div className="bear-grid bear-grid-cols-2 md:bear-grid-cols-5 bear-gap-3">
    {SEVERITY_ORDER.map((severity) => (
      <div key={severity} className="bear-rounded-lg bear-border bear-px-4 bear-py-3" style={tintedStyle(SEVERITY_META[severity].color)}>
        <Typography variant="caption" weight="semibold" className="bear-uppercase bear-tracking-wide">
          {SEVERITY_META[severity].label}
        </Typography>
        <Typography variant="h4" weight="bold">
          {result.severityCounts[severity]}
        </Typography>
      </div>
    ))}
  </div>
);
