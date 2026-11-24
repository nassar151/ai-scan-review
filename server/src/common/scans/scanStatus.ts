import { TERMINAL_SCAN_STATUSES, type ScanStatus } from '@scan/shared';

export const isTerminalStatus = (status: ScanStatus) =>
  (TERMINAL_SCAN_STATUSES as readonly ScanStatus[]).includes(status);
