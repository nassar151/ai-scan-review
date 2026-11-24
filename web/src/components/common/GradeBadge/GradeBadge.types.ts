import type { RiskGrade } from '@scan/shared';

export type GradeBadgeSize = 'sm' | 'lg';

export interface GradeBadgeProps {
  grade: RiskGrade;
  size?: GradeBadgeSize;
}
