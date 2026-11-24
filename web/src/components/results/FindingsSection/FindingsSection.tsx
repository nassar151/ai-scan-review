import { Button, Chip, EmptyState, Input, SegmentedControl, Select, Typography } from '@forgedevstack/bear';
import { PRIORITY_ORDER } from '@scan/shared';
import { useMemo, useState } from 'react';
import { PRIORITY_META } from '../../../theme/display.consts';
import { plural } from '../../../utils/text';
import { FindingsTable } from '../FindingsTable/FindingsTable';
import {
  ALL_OPTION,
  DEFAULT_FILTERS,
  PAGE_SIZE,
  SEARCH_PLACEHOLDER,
  SEVERITY_OPTIONS,
  TYPE_OPTIONS,
} from './FindingsSection.consts';
import { countByPriority, filterFindings } from './FindingsSection.helpers';
import type { FindingFilters, FindingsSectionProps } from './FindingsSection.types';

export const FindingsSection = ({ findings, focusAction, onClearFocus }: FindingsSectionProps) => {
  const [filters, setFilters] = useState<FindingFilters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string>();

  const priorityCounts = useMemo(() => countByPriority(findings), [findings]);
  const shownFindings = useMemo(() => {
    if (!focusAction) return filterFindings(findings, filters);
    const focusIds = new Set(focusAction.findingIds);
    return findings.filter((finding) => focusIds.has(finding.id));
  }, [findings, filters, focusAction]);

  const updateFilters = (patch: Partial<FindingFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setVisibleCount(PAGE_SIZE);
  };

  const priorityItems = [
    { value: ALL_OPTION, label: `All (${findings.length})` },
    ...PRIORITY_ORDER.map((priority) => ({
      value: priority,
      label: `${PRIORITY_META[priority].label} (${priorityCounts[priority]})`,
    })),
  ];

  return (
    <section className="bear-flex bear-flex-col bear-gap-4">
      <div className="bear-flex bear-items-baseline bear-justify-between bear-gap-3">
        <Typography variant="h5" weight="bold">
          Findings
        </Typography>
        <Typography variant="body2" color="muted">
          Showing {Math.min(visibleCount, shownFindings.length)} of {plural(shownFindings.length, 'finding')}
        </Typography>
      </div>

      {focusAction ? (
        <div className="bear-flex bear-items-center bear-gap-2 bear-flex-wrap">
          <Typography variant="body2" color="muted">
            Findings resolved by:
          </Typography>
          <Chip color="primary" variant="soft" onDelete={onClearFocus}>
            {focusAction.title}
          </Chip>
        </div>
      ) : (
        <div className="bear-flex bear-flex-col lg:bear-flex-row bear-gap-3 lg:bear-items-center">
          <SegmentedControl
            items={priorityItems}
            value={filters.priority}
            onChange={(priority) => updateFilters({ priority: priority as FindingFilters['priority'] })}
            size="sm"
          />
          <div className="bear-flex bear-flex-1 bear-gap-3 bear-flex-wrap">
            <Select
              options={TYPE_OPTIONS}
              value={filters.type}
              onChange={(type) => updateFilters({ type: type as FindingFilters['type'] })}
              size="sm"
            />
            <Select
              options={SEVERITY_OPTIONS}
              value={filters.severity}
              onChange={(severity) => updateFilters({ severity: severity as FindingFilters['severity'] })}
              size="sm"
            />
            <div className="bear-flex-1">
              <Input
                placeholder={SEARCH_PLACEHOLDER}
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                clearable
                onClear={() => updateFilters({ query: '' })}
                size="sm"
                fullWidth
              />
            </div>
          </div>
        </div>
      )}

      {shownFindings.length === 0 ? (
        <EmptyState
          preset="filter-empty"
          size="sm"
          title="No findings match"
          description="Try another priority, type or search term."
          action={<Button size="sm" variant="outline" onClick={() => updateFilters(DEFAULT_FILTERS)}>Reset filters</Button>}
        />
      ) : (
        <FindingsTable
          findings={shownFindings.slice(0, visibleCount)}
          expandedId={expandedId}
          onToggle={(findingId) => setExpandedId((current) => (current === findingId ? undefined : findingId))}
        />
      )}

      {visibleCount < shownFindings.length && (
        <div className="bear-flex bear-justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, shownFindings.length - visibleCount)} more
          </Button>
        </div>
      )}
    </section>
  );
};
