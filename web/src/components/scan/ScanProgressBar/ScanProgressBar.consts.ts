export const PROGRESS_TONE = {
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export const PROGRESS_TONE_META = {
  [PROGRESS_TONE.RUNNING]: { color: '#2563eb', gradient: 'linear-gradient(90deg, #2563eb, #7c3aed, #06b6d4, #2563eb)' },
  [PROGRESS_TONE.DONE]: { color: '#15803d', gradient: 'linear-gradient(90deg, #16a34a, #22c55e)' },
  [PROGRESS_TONE.FAILED]: { color: '#b91c1c', gradient: 'linear-gradient(90deg, #dc2626, #f87171)' },
} as const;

export const PROGRESS_TRACK_COLOR = '#e5e7eb';
/** Bear's keyframes slide the background; the oversized gradient makes the colours flow along the bar. */
export const RUNNING_ANIMATION = 'bear-gradient-shift 2.5s linear infinite';
export const RUNNING_BACKGROUND_SIZE = '300% 100%';
export const FILL_TRANSITION = 'width 700ms ease-out';
