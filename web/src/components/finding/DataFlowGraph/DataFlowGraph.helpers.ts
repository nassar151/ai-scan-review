import type { CSSProperties } from 'react';
import type { DataFlow } from '@scan/shared';
import { DATA_FLOW_STEP_META } from '../../../theme/display.consts';
import { formatLocation } from '../../../utils/format';
import { ATTACKER_NODE, NODE_BACKGROUND_ALPHA, NODE_BORDER_ALPHA, NODE_FLEX, NODE_MAX_WIDTH } from './DataFlowGraph.consts';
import type { AttackPathNode } from './DataFlowGraph.types';

export const nodeStyle = (color: string): CSSProperties => ({
  flex: NODE_FLEX,
  maxWidth: NODE_MAX_WIDTH,
  backgroundColor: `${color}${NODE_BACKGROUND_ALPHA}`,
  borderColor: `${color}${NODE_BORDER_ALPHA}`,
});

/** Attacker first, then source → … → sink; a location is shown only when the backend confirmed it. */
export const attackPathNodes = (dataFlow: DataFlow | undefined, attackScenario: string | undefined): AttackPathNode[] => [
  ...(attackScenario ? [{ ...ATTACKER_NODE, description: attackScenario }] : []),
  ...(dataFlow?.steps ?? []).map((step, index) => ({
    key: `${index}-${step.kind}-${step.description}`,
    label: DATA_FLOW_STEP_META[step.kind].label,
    color: DATA_FLOW_STEP_META[step.kind].color,
    description: step.description,
    location: step.path && formatLocation(step.path, step.line),
    example: step.example,
  })),
];
