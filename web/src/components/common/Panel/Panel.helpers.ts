import type { CSSProperties } from 'react';
import { PANEL_BACKGROUND_ALPHA, PANEL_BORDER_ALPHA, PANEL_TONE_COLOR, PLAIN_PANEL_STYLE } from './Panel.consts';
import type { PanelTone } from './Panel.types';

export const panelStyle = (tone: PanelTone): CSSProperties => {
  if (tone === 'plain') return PLAIN_PANEL_STYLE;
  const color = PANEL_TONE_COLOR[tone];
  return { backgroundColor: `${color}${PANEL_BACKGROUND_ALPHA}`, borderColor: `${color}${PANEL_BORDER_ALPHA}` };
};
