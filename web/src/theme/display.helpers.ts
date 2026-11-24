import type { CSSProperties } from 'react';
import { ACCENT_BAR_WIDTH, TINT_BACKGROUND_ALPHA, TINT_BORDER_ALPHA } from './display.consts';

/** Coloured text on a faint tint of the same colour. */
export const tintedStyle = (color: string): CSSProperties => ({
  color,
  backgroundColor: `${color}${TINT_BACKGROUND_ALPHA}`,
  borderColor: `${color}${TINT_BORDER_ALPHA}`,
});

/** Left accent bar drawn as an inset shadow so it works on table cells and rounded cards alike. */
export const accentInsetStyle = (color: string): CSSProperties => ({
  boxShadow: `inset ${ACCENT_BAR_WIDTH} 0 0 ${color}`,
});
