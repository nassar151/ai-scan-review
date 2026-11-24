import { Alert, Button } from '@forgedevstack/bear';
import { useNavigate } from 'react-router-dom';
import { scanPath } from '../../../app/routes.helpers';
import { useStartScan } from '../../../queries/useStartScan';
import { FALLBACK_FAILURE_MESSAGE } from './ScanFailedAlert.consts';
import type { ScanFailedAlertProps } from './ScanFailedAlert.types';

export const ScanFailedAlert = ({ scan }: ScanFailedAlertProps) => {
  const navigate = useNavigate();
  const startScan = useStartScan();

  const handleRetry = () =>
    startScan.mutate(scan.repo.url, { onSuccess: (nextScan) => navigate(scanPath(nextScan.id)) });

  return (
    <Alert
      severity="error"
      title="The scan could not finish"
      action={
        <Button size="sm" variant="outline" onClick={handleRetry} loading={startScan.isPending}>
          Try again
        </Button>
      }
    >
      {startScan.error?.message ?? scan.error ?? FALLBACK_FAILURE_MESSAGE}
    </Alert>
  );
};
