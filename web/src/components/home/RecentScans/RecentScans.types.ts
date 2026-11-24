import type { ScanSummary } from '@scan/shared';

export interface RecentScansProps {
  scans: ScanSummary[];
  isLoading: boolean;
  error: Error | null;
}
