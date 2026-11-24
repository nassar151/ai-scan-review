import type { PROGRESS_TONE } from './ScanProgressBar.consts';

export type ProgressTone = (typeof PROGRESS_TONE)[keyof typeof PROGRESS_TONE];

export interface ScanProgressBarProps {
  percent: number;
  tone: ProgressTone;
  /** Shown on the right of the percentage, e.g. "3 of 5 steps done · AI investigation". */
  caption: string;
}
