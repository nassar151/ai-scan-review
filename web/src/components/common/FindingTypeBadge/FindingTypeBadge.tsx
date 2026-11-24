import { FINDING_TYPE_META } from '../../../theme/display.consts';
import { Pill } from '../Pill/Pill';
import type { FindingTypeBadgeProps } from './FindingTypeBadge.types';

export const FindingTypeBadge = ({ type }: FindingTypeBadgeProps) => {
  const meta = FINDING_TYPE_META[type];
  return <Pill variant={meta.variant}>{meta.label}</Pill>;
};
