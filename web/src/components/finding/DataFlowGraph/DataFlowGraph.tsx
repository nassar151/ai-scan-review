import { Fragment } from 'react';
import { Typography } from '@forgedevstack/bear';
import { EXAMPLE_LABEL, FLOW_ARROW } from './DataFlowGraph.consts';
import { attackPathNodes, nodeStyle } from './DataFlowGraph.helpers';
import type { DataFlowGraphProps } from './DataFlowGraph.types';

/** One attack path, left to right: the attacker's move, then each code step with the example value it carries. */
export const DataFlowGraph = ({ dataFlow, attackScenario }: DataFlowGraphProps) => {
  const nodes = attackPathNodes(dataFlow, attackScenario);
  return (
    <div className="bear-flex bear-flex-col bear-gap-2">
      {nodes.length > 0 && (
        <ol className="bear-flex bear-flex-wrap bear-items-stretch bear-gap-2">
          {nodes.map((node, index) => (
            <Fragment key={node.key}>
              {index > 0 && (
                <li aria-hidden className="bear-flex bear-items-center bear-text-lg bear-text-primary-700">
                  {FLOW_ARROW}
                </li>
              )}
              <li className="bear-flex bear-flex-col bear-gap-1 bear-rounded-md bear-border bear-p-2" style={nodeStyle(node.color)}>
                <Typography variant="caption" weight="semibold" style={{ color: node.color }}>
                  {node.label}
                </Typography>
                {node.location && (
                  <span className="bear-font-mono bear-text-xs bear-break-all bear-text-primary-700">{node.location}</span>
                )}
                <Typography variant="caption" lineHeight="relaxed">
                  {node.description}
                </Typography>
                {node.example && (
                  <code
                    title={EXAMPLE_LABEL}
                    className="bear-font-mono bear-text-xs bear-break-words bear-rounded bear-bg-white bear-border bear-px-1"
                  >
                    {node.example}
                  </code>
                )}
              </li>
            </Fragment>
          ))}
        </ol>
      )}
      {dataFlow?.summary && (
        <Typography variant="caption" color="muted" className="bear-font-mono bear-break-words">
          {dataFlow.summary}
        </Typography>
      )}
    </div>
  );
};
