import type { NextAction } from '@scan/shared';

export interface NextActionsProps {
  actions: NextAction[];
  onShowFindings: (action: NextAction) => void;
}
