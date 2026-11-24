import { PRIORITY_ORDER, type Finding, type Priority } from '@scan/shared';
import { ALL_OPTION } from './FindingsSection.consts';
import type { FindingFilters } from './FindingsSection.types';

const searchableText = (finding: Finding) =>
  [
    finding.title,
    finding.dependency?.packageName,
    ...(finding.dependency?.advisories.flatMap((advisory) => [advisory.id, ...advisory.cveIds]) ?? []),
    ...finding.locations.map((location) => location.path),
    ...finding.cwe,
    ...finding.ruleIds,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const matches = <T extends string>(selected: T | typeof ALL_OPTION, value: T) =>
  selected === ALL_OPTION || selected === value;

export const filterFindings = (findings: Finding[], filters: FindingFilters) => {
  const query = filters.query.trim().toLowerCase();
  return findings.filter(
    (finding) =>
      matches(filters.priority, finding.priority) &&
      matches(filters.type, finding.type) &&
      matches(filters.severity, finding.severity) &&
      (!query || searchableText(finding).includes(query)),
  );
};

export const countByPriority = (findings: Finding[]) =>
  PRIORITY_ORDER.reduce(
    (counts, priority) => ({ ...counts, [priority]: findings.filter((finding) => finding.priority === priority).length }),
    {} as Record<Priority, number>,
  );
