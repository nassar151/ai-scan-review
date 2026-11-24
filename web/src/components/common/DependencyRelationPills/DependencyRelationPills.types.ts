import type { DependencyInfo } from '@scan/shared';
import type { BadgeVariant } from '../../../theme/display.types';

export interface DependencyRelationPillsProps {
  dependency: DependencyInfo;
}

export interface RelationPill {
  label: string;
  variant: BadgeVariant;
  /** Hover text, e.g. the package that pulls an indirect dependency in. */
  hint: string;
}
