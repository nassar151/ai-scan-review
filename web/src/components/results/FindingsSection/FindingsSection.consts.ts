import { FINDING_TYPE, SEVERITY_ORDER } from '@scan/shared';
import { FINDING_TYPE_META, SEVERITY_META } from '../../../theme/display.consts';

export const ALL_OPTION = 'all';
export const PAGE_SIZE = 25;

export const DEFAULT_FILTERS = {
  priority: ALL_OPTION,
  type: ALL_OPTION,
  severity: ALL_OPTION,
  query: '',
} as const;

export const TYPE_OPTIONS = [
  { value: ALL_OPTION, label: 'All types' },
  ...Object.values(FINDING_TYPE).map((type) => ({ value: type, label: FINDING_TYPE_META[type].label })),
];

export const SEVERITY_OPTIONS = [
  { value: ALL_OPTION, label: 'All severities' },
  ...SEVERITY_ORDER.map((severity) => ({ value: severity, label: SEVERITY_META[severity].label })),
];

export const SEARCH_PLACEHOLDER = 'Search title, package, CVE, file…';
