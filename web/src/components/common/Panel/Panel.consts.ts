/** Accent per tone: title colour plus a faint tint for the border and background. */
export const PANEL_TONE_COLOR = {
  plain: '#1e3a8a',
  highlight: '#0369a1',
  danger: '#b91c1c',
  success: '#15803d',
} as const;

/** Hex alpha suffixes; plain panels stay white with a grey border. */
export const PANEL_BACKGROUND_ALPHA = '0d';
export const PANEL_BORDER_ALPHA = '40';
export const PLAIN_PANEL_STYLE = { backgroundColor: '#ffffff', borderColor: '#e4e4e7' } as const;
