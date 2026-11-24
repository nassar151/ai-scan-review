import type { CSSProperties } from 'react';
import {
  FILL_TRANSITION,
  PROGRESS_TONE,
  PROGRESS_TONE_META,
  RUNNING_ANIMATION,
  RUNNING_BACKGROUND_SIZE,
} from './ScanProgressBar.consts';
import type { ProgressTone } from './ScanProgressBar.types';

export const fillStyle = (tone: ProgressTone, percent: number): CSSProperties => ({
  width: `${percent}%`,
  backgroundImage: PROGRESS_TONE_META[tone].gradient,
  transition: FILL_TRANSITION,
  ...(tone === PROGRESS_TONE.RUNNING && { backgroundSize: RUNNING_BACKGROUND_SIZE, animation: RUNNING_ANIMATION }),
});
