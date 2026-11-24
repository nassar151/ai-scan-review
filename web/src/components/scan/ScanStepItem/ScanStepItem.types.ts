import type { ScanStage } from '@scan/shared';

export interface ScanStepItemProps {
  stage: ScanStage;
  /** Current time, so a running stage shows its live duration. */
  now: number;
  isLast: boolean;
}
