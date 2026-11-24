import { FIX_STATUS_META } from '../../../theme/display.consts';
import { Pill } from '../Pill/Pill';
import type { FixStatusBadgeProps } from './FixStatusBadge.types';

export const FixStatusBadge = ({ fixAvailable }: FixStatusBadgeProps) => {
  const meta = fixAvailable ? FIX_STATUS_META.available : FIX_STATUS_META.unavailable;
  return <Pill variant={meta.variant}>{meta.label}</Pill>;
};
