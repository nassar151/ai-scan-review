import type { DataFlow } from '@scan/shared';

export interface DataFlowGraphProps {
  dataFlow?: DataFlow;
  /** How an attacker would abuse the flow; shown as the first node. */
  attackScenario?: string;
}

export interface AttackPathNode {
  key: string;
  label: string;
  color: string;
  description: string;
  location?: string;
  example?: string;
}
