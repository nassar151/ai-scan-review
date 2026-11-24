import { Typography } from '@forgedevstack/bear';
import type { CardTitleProps } from './CardTitle.types';

export const CardTitle = ({ title, subtitle }: CardTitleProps) => (
  <div className="bear-flex bear-flex-col bear-gap-1">
    <Typography variant="h6">{title}</Typography>
    {subtitle && (
      <Typography variant="body2" color="muted">
        {subtitle}
      </Typography>
    )}
  </div>
);
