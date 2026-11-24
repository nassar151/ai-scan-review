import { Button, Link, Typography } from '@forgedevstack/bear';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes.consts';
import { BRAND_ACCENT, SCAN_STATUS_META } from '../../../theme/display.consts';
import { formatDateTime, shortSha } from '../../../utils/format';
import { isTerminalStatus } from '../../../utils/scanStatus';
import { Pill } from '../../common/Pill/Pill';
import { BACK_HOME_LABEL, NEW_SCAN_LABEL } from './ScanHeader.consts';
import type { ScanHeaderProps } from './ScanHeader.types';

export const ScanHeader = ({ scan }: ScanHeaderProps) => {
  const navigate = useNavigate();
  const { repo } = scan;
  const statusMeta = SCAN_STATUS_META[scan.status];

  return (
    <div className="bear-flex bear-flex-col md:bear-flex-row md:bear-items-center bear-justify-between bear-gap-4">
      <div className="bear-flex bear-flex-col bear-gap-1 bear-min-w-0">
        <div className="bear-flex bear-items-center bear-gap-3 bear-flex-wrap">
          <Typography variant="h4" weight="bold" truncate>
            {repo.owner}/{repo.name}
          </Typography>
          <Pill variant={statusMeta.variant}>{statusMeta.label}</Pill>
        </div>
        <Typography variant="body2" color="muted">
          <Link href={repo.url} external color={BRAND_ACCENT}>
            {repo.url}
          </Link>
          {repo.defaultBranch && ` · branch ${repo.defaultBranch}`}
          {repo.commitSha && ` · commit ${shortSha(repo.commitSha)}`}
          {` · started ${formatDateTime(scan.createdAt)}`}
        </Typography>
      </div>
      <Button variant="outline" onClick={() => navigate(ROUTES.HOME)}>
        {isTerminalStatus(scan.status) ? NEW_SCAN_LABEL : BACK_HOME_LABEL}
      </Button>
    </div>
  );
};
