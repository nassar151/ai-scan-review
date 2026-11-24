import type { ScanSummary } from '@scan/shared';

export interface RecentScanRowProps {
  scan: ScanSummary;
  onOpen: (scanId: string) => void;
}
