import { Card, CardBody, Typography } from '@forgedevstack/bear';
import { useNow } from '../../../hooks/useNow';
import { formatDuration } from '../../../utils/format';
import { isTerminalStatus } from '../../../utils/scanStatus';
import { ScanProgressBar } from '../ScanProgressBar/ScanProgressBar';
import { ScanStepItem } from '../ScanStepItem/ScanStepItem';
import { ELAPSED_TICK_MS } from './ScanProgress.consts';
import { progressCaption, progressPercent, progressTone } from './ScanProgress.helpers';
import type { ScanProgressProps } from './ScanProgress.types';

export const ScanProgress = ({ scan }: ScanProgressProps) => {
  const isRunning = !isTerminalStatus(scan.status);
  const now = useNow(ELAPSED_TICK_MS, isRunning);
  const startedAt = Date.parse(scan.startedAt ?? scan.createdAt);
  const endedAt = scan.finishedAt ? Date.parse(scan.finishedAt) : now;

  return (
    <Card padding="lg">
      <CardBody className="bear-flex bear-flex-col bear-gap-6">
        <div className="bear-flex bear-items-baseline bear-justify-between bear-gap-4">
          <Typography variant="h6">{isRunning ? 'Scanning…' : 'Scan timeline'}</Typography>
          <Typography variant="body2" color="muted" className="bear-font-mono">
            {isRunning ? 'Elapsed' : 'Total'} {formatDuration(endedAt - startedAt)}
          </Typography>
        </div>
        <ScanProgressBar percent={progressPercent(scan.stages)} tone={progressTone(scan)} caption={progressCaption(scan)} />
        <ol className="bear-flex bear-flex-col">
          {scan.stages.map((stage, index) => (
            <ScanStepItem key={stage.status} stage={stage} now={now} isLast={index === scan.stages.length - 1} />
          ))}
        </ol>
      </CardBody>
    </Card>
  );
};
