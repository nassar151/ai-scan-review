import { Button, EmptyState, Skeleton } from '@forgedevstack/bear';
import { SCAN_STATUS } from '@scan/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES, SCAN_ROUTE_PARAM } from '../../app/routes.consts';
import { ScanResults } from '../../components/results/ScanResults/ScanResults';
import { ScanFailedAlert } from '../../components/scan/ScanFailedAlert/ScanFailedAlert';
import { ScanHeader } from '../../components/scan/ScanHeader/ScanHeader';
import { ScanProgress } from '../../components/scan/ScanProgress/ScanProgress';
import { useScan } from '../../queries/useScan';
import { LOADING_HEIGHT } from './ScanPage.consts';

export const ScanPage = () => {
  const navigate = useNavigate();
  const scanId = useParams()[SCAN_ROUTE_PARAM] ?? '';
  const { data: scan, isLoading, error } = useScan(scanId);

  if (isLoading) return <Skeleton variant="rounded" height={LOADING_HEIGHT} />;
  if (!scan) {
    return (
      <EmptyState
        preset="404"
        title="Scan not found"
        description={error?.message ?? 'This scan does not exist.'}
        action={<Button onClick={() => navigate(ROUTES.HOME)}>Start a new scan</Button>}
      />
    );
  }

  const renderBody = () => {
    if (scan.status === SCAN_STATUS.FAILED) {
      return (
        <>
          <ScanFailedAlert scan={scan} />
          <ScanProgress scan={scan} />
        </>
      );
    }
    if (scan.status !== SCAN_STATUS.COMPLETED || !scan.result) return <ScanProgress scan={scan} />;
    return <ScanResults scan={scan} result={scan.result} />;
  };

  return (
    <div className="bear-flex bear-flex-col bear-gap-6">
      <ScanHeader scan={scan} />
      {renderBody()}
    </div>
  );
};
