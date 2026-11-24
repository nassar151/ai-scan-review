import { Typography } from '@forgedevstack/bear';
import { PANEL_TONE_COLOR } from './Panel.consts';
import { panelStyle } from './Panel.helpers';
import type { PanelProps } from './Panel.types';

export const Panel = ({ title, caption, tone = 'plain', children }: PanelProps) => (
  <section className="bear-flex bear-flex-col bear-gap-3 bear-rounded-lg bear-border bear-p-4 bear-min-w-0" style={panelStyle(tone)}>
    {(title || caption) && (
      <div className="bear-flex bear-flex-wrap bear-items-baseline bear-justify-between bear-gap-2">
        {title && (
          <Typography variant="overline" weight="semibold" style={{ color: PANEL_TONE_COLOR[tone] }}>
            {title}
          </Typography>
        )}
        {caption && (
          <Typography variant="caption" color="muted">
            {caption}
          </Typography>
        )}
      </div>
    )}
    {children}
  </section>
);
