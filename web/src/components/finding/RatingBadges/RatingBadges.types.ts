import type { Priority, Severity } from '@scan/shared';

export interface RatingBadgesProps {
  severity: Severity;
  riskScore: number;
  priority: Priority;
  /** Greyed out, for the rating before the AI change. */
  muted?: boolean;
}
