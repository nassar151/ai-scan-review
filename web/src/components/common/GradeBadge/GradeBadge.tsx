import { Tooltip } from '@forgedevstack/bear';
import { GRADE_META } from '../../../theme/display.consts';
import { tintedStyle } from '../../../theme/display.helpers';
import { GRADE_SIZE_CLASS } from './GradeBadge.consts';
import type { GradeBadgeProps } from './GradeBadge.types';

export const GradeBadge = ({ grade, size = 'sm' }: GradeBadgeProps) => {
  const meta = GRADE_META[grade];
  return (
    <Tooltip content={`Grade ${grade}: ${meta.label}`}>
      <span
        className={`bear-inline-flex bear-shrink-0 bear-items-center bear-justify-center bear-border bear-font-bold ${GRADE_SIZE_CLASS[size]}`}
        style={tintedStyle(meta.color)}
      >
        {grade}
      </span>
    </Tooltip>
  );
};
