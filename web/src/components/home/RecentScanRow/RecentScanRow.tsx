import { Card, Spinner, Typography } from '@forgedevstack/bear';
import { SEVERITY_ORDER } from '@scan/shared';
import { SCAN_STATUS_META } from '../../../theme/display.consts';
import { formatRelativeTime } from '../../../utils/format';
import { isTerminalStatus } from '../../../utils/scanStatus';
import { GradeBadge } from '../../common/GradeBadge/GradeBadge';
import { Pill } from '../../common/Pill/Pill';
import { SeverityBadge } from '../../common/SeverityBadge/SeverityBadge';
import type { RecentScanRowProps } from './RecentScanRow.types';

export const RecentScanRow = ({ scan, onOpen }: RecentScanRowProps) => {
  const statusMeta = SCAN_STATUS_META[scan.status];
  const severityCounts = scan.severityCounts;
  return (
    <Card variant="outlined" padding="sm" interactive onClick={() => onOpen(scan.id)} className="bear-cursor-pointer">
      <div className="bear-flex bear-items-center bear-gap-4">
        {scan.grade ? <GradeBadge grade={scan.grade} /> : !isTerminalStatus(scan.status) && <Spinner size="sm" />}
        <div className="bear-flex-1 bear-min-w-0">
          <Typography weight="semibold" truncate>
            {scan.repo.owner}/{scan.repo.name}
          </Typography>
          <Typography variant="caption" color="muted" truncate>
            {scan.error ?? formatRelativeTime(scan.createdAt)}
          </Typography>
        </div>
        <div className="bear-hidden md:bear-flex bear-gap-1">
          {severityCounts &&
            SEVERITY_ORDER.filter((severity) => severityCounts[severity] > 0).map((severity) => (
              <span key={severity} className="bear-inline-flex bear-items-center bear-gap-1">
                <SeverityBadge severity={severity} />
                <span className="bear-text-xs bear-font-mono">{severityCounts[severity]}</span>
              </span>
            ))}
        </div>
        <Pill variant={statusMeta.variant}>{statusMeta.label}</Pill>
      </div>
    </Card>
  );
};
