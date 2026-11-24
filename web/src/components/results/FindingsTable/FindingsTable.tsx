import { FindingTableRow } from '../FindingTableRow/FindingTableRow';
import { FINDINGS_TABLE_COLUMNS } from './FindingsTable.consts';
import type { FindingsTableProps } from './FindingsTable.types';

/** Plain table instead of Bear's DataTable, which cannot expand a detail panel under a row. */
export const FindingsTable = ({ findings, expandedId, onToggle }: FindingsTableProps) => (
  <div className="bear-overflow-x-auto bear-rounded-lg bear-border bear-bg-white">
    <table className="bear-w-full bear-border-collapse bear-text-sm">
      <thead className="bear-bg-primary-700">
        <tr>
          {FINDINGS_TABLE_COLUMNS.map((column) => (
            <th
              key={column.key}
              scope="col"
              style={'minWidth' in column ? { minWidth: column.minWidth } : undefined}
              className="bear-px-3 bear-py-3 bear-text-left bear-text-xs bear-font-semibold bear-uppercase bear-tracking-wide bear-text-white bear-whitespace-nowrap"
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {findings.map((finding) => (
          <FindingTableRow
            key={finding.id}
            finding={finding}
            columnCount={FINDINGS_TABLE_COLUMNS.length}
            isExpanded={finding.id === expandedId}
            onToggle={onToggle}
          />
        ))}
      </tbody>
    </table>
  </div>
);
