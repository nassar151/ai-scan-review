import { Typography } from '@forgedevstack/bear';
import { RISK_SCORE_MAX } from '@scan/shared';
import type { KeyboardEvent } from 'react';
import { SEVERITY_META } from '../../../theme/display.consts';
import { accentInsetStyle } from '../../../theme/display.helpers';
import { AiBadge } from '../../common/AiBadge/AiBadge';
import { DependencyRelationPills } from '../../common/DependencyRelationPills/DependencyRelationPills';
import { FindingTypeBadge } from '../../common/FindingTypeBadge/FindingTypeBadge';
import { InvestigationPill } from '../../common/InvestigationPill/InvestigationPill';
import { PriorityBadge } from '../../common/PriorityBadge/PriorityBadge';
import { SeverityBadge } from '../../common/SeverityBadge/SeverityBadge';
import { StackedText } from '../../common/StackedText/StackedText';
import { FindingDetails } from '../../finding/FindingDetails/FindingDetails';
import { CELL, COLLAPSED_ICON, EXPANDED_CELL_STYLE, EXPANDED_ICON, NOWRAP_CELL, TOGGLE_KEYS } from './FindingTableRow.consts';
import { fixCell, identifiersCell } from './FindingTableRow.helpers';
import type { FindingTableRowProps } from './FindingTableRow.types';

export const FindingTableRow = ({ finding, columnCount, isExpanded, onToggle }: FindingTableRowProps) => {
  const { investigation } = finding;
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!TOGGLE_KEYS.includes(event.key)) return;
    event.preventDefault();
    onToggle(finding.id);
  };

  return (
    <>
      <tr
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => onToggle(finding.id)}
        onKeyDown={handleKeyDown}
        className={`bear-cursor-pointer bear-border-t bear-transition ${
          isExpanded ? 'bear-bg-primary-50' : 'hover:bear-bg-zinc-50'
        }`}
      >
        <td className={`${NOWRAP_CELL} bear-pl-4`} style={accentInsetStyle(SEVERITY_META[finding.severity].color)}>
          <div className="bear-flex bear-items-start bear-gap-2">
            <span aria-hidden className="bear-text-primary-700">
              {isExpanded ? EXPANDED_ICON : COLLAPSED_ICON}
            </span>
            <StackedText mono {...identifiersCell(finding)} />
          </div>
        </td>
        <td className={CELL}>
          <div className="bear-flex bear-flex-col bear-items-start bear-gap-1">
            <Typography variant="body2" weight="semibold">
              {finding.title}
            </Typography>
            {investigation && <AiBadge />}
          </div>
        </td>
        <td className={NOWRAP_CELL}>
          <Typography variant="body2" weight="semibold" className="bear-font-mono">
            {finding.occurrences}
          </Typography>
        </td>
        <td className={NOWRAP_CELL}>
          <div className="bear-flex bear-flex-col bear-items-start bear-gap-1">
            <FindingTypeBadge type={finding.type} />
            {finding.dependency && <DependencyRelationPills dependency={finding.dependency} />}
          </div>
        </td>
        <td className={NOWRAP_CELL}>
          <SeverityBadge severity={finding.severity} />
        </td>
        <td className={NOWRAP_CELL}>
          <PriorityBadge priority={finding.priority} />
        </td>
        <td className={NOWRAP_CELL}>
          <div className="bear-flex bear-flex-col bear-items-start bear-gap-1">
            <Typography variant="body2" weight="bold" className="bear-font-mono">
              {finding.riskScore}
              <Typography variant="caption" color="muted" component="span">
                /{RISK_SCORE_MAX}
              </Typography>
            </Typography>
            {investigation && <InvestigationPill investigation={investigation} />}
          </div>
        </td>
        <td className={CELL}>
          <StackedText mono {...fixCell(finding)} />
        </td>
      </tr>
      {isExpanded && (
        <tr className="bear-bg-primary-50">
          <td colSpan={columnCount} className="bear-px-4 bear-pb-4" style={EXPANDED_CELL_STYLE}>
            <div className="bear-overflow-hidden bear-rounded-lg bear-border bear-border-primary-200 bear-bg-white bear-p-5">
              <FindingDetails finding={finding} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
