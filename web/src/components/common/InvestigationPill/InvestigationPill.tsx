import { FALSE_POSITIVE_META, REACHABILITY_META } from '../../../theme/display.consts';
import { Pill } from '../Pill/Pill';
import type { InvestigationPillProps } from './InvestigationPill.types';

/** The agent's headline verdict: false positive wins over reachability. */
export const InvestigationPill = ({ investigation }: InvestigationPillProps) => {
  const meta = investigation.falsePositive ? FALSE_POSITIVE_META : REACHABILITY_META[investigation.reachability];
  return <Pill variant={meta.variant}>{meta.label}</Pill>;
};
