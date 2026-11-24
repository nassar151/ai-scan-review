import { Typography } from '@forgedevstack/bear';
import type { DetailSectionProps } from './DetailSection.types';

export const DetailSection = ({ title, caption, children }: DetailSectionProps) => (
  <section className="bear-flex bear-flex-col bear-gap-2">
    <div>
      <Typography variant="overline" color="muted">
        {title}
      </Typography>
      {caption && (
        <Typography variant="caption" color="muted" component="p">
          {caption}
        </Typography>
      )}
    </div>
    {children}
  </section>
);
