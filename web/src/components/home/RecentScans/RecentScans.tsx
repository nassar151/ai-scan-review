import { Alert, EmptyState, Skeleton, Typography } from '@forgedevstack/bear';
import { useNavigate } from 'react-router-dom';
import { scanPath } from '../../../app/routes.helpers';
import { RecentScanRow } from '../RecentScanRow/RecentScanRow';
import { LOADING_ROW_COUNT, LOADING_ROW_HEIGHT } from './RecentScans.consts';
import type { RecentScansProps } from './RecentScans.types';

export const RecentScans = ({ scans, isLoading, error }: RecentScansProps) => {
  const navigate = useNavigate();

  const renderContent = () => {
    if (isLoading) return <Skeleton variant="rounded" height={LOADING_ROW_HEIGHT} count={LOADING_ROW_COUNT} />;
    if (error) return <Alert severity="error" title="Could not load recent scans">{error.message}</Alert>;
    return scans.length === 0 ? (
      <EmptyState preset="inbox" size="sm" title="No scans yet" description="Paste a repository URL above to run the first one." />
    ) : (
      scans.map((scan) => <RecentScanRow key={scan.id} scan={scan} onOpen={(id) => navigate(scanPath(id))} />)
    );
  };

  return (
    <section className="bear-flex bear-flex-col bear-gap-3">
      <Typography variant="h6">Recent scans</Typography>
      {renderContent()}
    </section>
  );
};
