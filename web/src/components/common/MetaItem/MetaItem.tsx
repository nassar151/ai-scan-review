import { Typography } from '@forgedevstack/bear';
import type { MetaItemProps } from './MetaItem.types';

export const MetaItem = ({ label, children }: MetaItemProps) => (
  <div className="bear-flex bear-flex-col bear-gap-0.5 bear-min-w-0">
    <Typography variant="caption" color="muted">
      {label}
    </Typography>
    <div className="bear-text-sm bear-break-words">{children}</div>
  </div>
);
