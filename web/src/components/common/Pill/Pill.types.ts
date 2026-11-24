import type { ReactNode } from 'react';
import type { BadgeVariant } from '../../../theme/display.types';

export interface PillProps {
  variant: BadgeVariant;
  children: ReactNode;
}
