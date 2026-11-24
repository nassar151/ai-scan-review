export const MAX_ROW_IDENTIFIERS = 1;

export const CELL = 'bear-px-3 bear-py-3 bear-align-top';
export const NOWRAP_CELL = `${CELL} bear-whitespace-nowrap`;

/** max-width 0 lets the full-width details cell follow the table width instead of growing with long code lines. */
export const EXPANDED_CELL_STYLE = { maxWidth: 0 } as const;

export const EXPANDED_ICON = '▾';
export const COLLAPSED_ICON = '▸';

/** Keys that toggle a focused row, matching native button behaviour. */
export const TOGGLE_KEYS: readonly string[] = ['Enter', ' '];

export const CELL_LABEL = {
  NO_FIX: 'No fix yet',
  NONE: '—',
} as const;
