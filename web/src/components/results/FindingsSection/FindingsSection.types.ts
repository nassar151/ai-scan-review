import type { Finding, FindingType, NextAction, Priority, Severity } from '@scan/shared';
import type { ALL_OPTION } from './FindingsSection.consts';

type AllOption = typeof ALL_OPTION;

export interface FindingFilters {
  priority: Priority | AllOption;
  type: FindingType | AllOption;
  severity: Severity | AllOption;
  query: string;
}

export interface FindingsSectionProps {
  findings: Finding[];
  /** When set, only the findings behind this next action are shown. */
  focusAction?: NextAction;
  onClearFocus: () => void;
}
