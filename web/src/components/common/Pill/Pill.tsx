import { BADGE_VARIANT_COLOR } from '../../../theme/display.consts';
import { tintedStyle } from '../../../theme/display.helpers';
import type { PillProps } from './Pill.types';

/** Tinted label; Bear's Badge relies on colour utilities its prebuilt stylesheet does not include. */
export const Pill = ({ variant, children }: PillProps) => (
  <span
    className="bear-inline-flex bear-items-center bear-gap-1 bear-rounded-full bear-border bear-px-2 bear-py-0.5 bear-text-xs bear-font-semibold bear-whitespace-nowrap"
    style={tintedStyle(BADGE_VARIANT_COLOR[variant])}
  >
    {children}
  </span>
);
