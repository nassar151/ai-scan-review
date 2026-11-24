import { Typography } from '@forgedevstack/bear';
import { CONFIDENCE_LABEL } from '../../../theme/display.consts';
import { plural } from '../../../utils/text';
import { InvestigationPill } from '../../common/InvestigationPill/InvestigationPill';
import { MetaItem } from '../../common/MetaItem/MetaItem';
import { Panel } from '../../common/Panel/Panel';
import { Pill } from '../../common/Pill/Pill';
import { DataFlowGraph } from '../DataFlowGraph/DataFlowGraph';
import { REACHABILITY_FLOW_TEXT } from './ReachabilityFlowPanel.consts';
import { evidenceSource, showsAttackPath } from './ReachabilityFlowPanel.helpers';
import type { ReachabilityFlowPanelProps } from './ReachabilityFlowPanel.types';

/** Can an attacker reach it, and the attack path from the attacker's move through source → sink, in one panel. */
export const ReachabilityFlowPanel = ({ finding }: ReachabilityFlowPanelProps) => {
  const { investigation } = finding;
  return (
    <Panel
      title={REACHABILITY_FLOW_TEXT.TITLE}
      caption={investigation && `✦ ${investigation.model} · ${plural(investigation.toolCalls, 'tool call')}`}
    >
      {investigation && (
        <>
          <div className="bear-flex bear-flex-wrap bear-items-center bear-gap-2">
            <InvestigationPill investigation={investigation} />
            <Pill variant="neutral">{CONFIDENCE_LABEL[investigation.confidence]}</Pill>
          </div>
          <Typography variant="body2" lineHeight="relaxed">
            {investigation.reachabilityExplanation ?? investigation.verdict}
          </Typography>
        </>
      )}

      {showsAttackPath(investigation) && (
        <DataFlowGraph dataFlow={investigation?.dataFlow} attackScenario={finding.attackScenario} />
      )}

      {investigation && investigation.evidence.length > 0 && (
        <MetaItem label={REACHABILITY_FLOW_TEXT.EVIDENCE}>
          <ul className="bear-flex bear-flex-col">
            {investigation.evidence.map((evidence) => (
              <li key={`${evidenceSource(evidence)}-${evidence.note}`}>
                <Typography variant="caption">
                  <span className="bear-font-mono bear-text-primary-700">{evidenceSource(evidence)}</span> — {evidence.note}
                </Typography>
              </li>
            ))}
          </ul>
        </MetaItem>
      )}
    </Panel>
  );
};
