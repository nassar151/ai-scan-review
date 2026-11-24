import type { ReactNode } from 'react';
import type { PANEL_TONE_COLOR } from './Panel.consts';

export type PanelTone = keyof typeof PANEL_TONE_COLOR;

export interface PanelProps {
  title?: string;
  /** Small text on the right of the title, e.g. the model that wrote the panel. */
  caption?: string;
  tone?: PanelTone;
  children: ReactNode;
}
