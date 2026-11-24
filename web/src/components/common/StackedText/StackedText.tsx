import { Typography } from '@forgedevstack/bear';
import type { StackedTextProps } from './StackedText.types';

/** A main value with an optional muted line under it, sized for table cells. */
export const StackedText = ({ primary, secondary, mono = false }: StackedTextProps) => (
  <div className="bear-flex bear-flex-col bear-gap-0.5 bear-min-w-0">
    <Typography
      variant={mono ? 'caption' : 'body2'}
      weight="medium"
      className={mono ? 'bear-font-mono bear-break-words' : 'bear-break-words'}
    >
      {primary}
    </Typography>
    {secondary && (
      <Typography variant="caption" color="muted" className="bear-line-clamp-2">
        {secondary}
      </Typography>
    )}
  </div>
);
