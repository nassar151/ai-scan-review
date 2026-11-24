import { Tooltip } from '@forgedevstack/bear';
import { PRIORITY_META } from '../../../theme/display.consts';
import { Pill } from '../Pill/Pill';
import type { PriorityBadgeProps } from './PriorityBadge.types';

export const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  const meta = PRIORITY_META[priority];
  return (
    <Tooltip content={meta.hint}>
      <Pill variant={meta.variant}>{meta.label}</Pill>
    </Tooltip>
  );
};
