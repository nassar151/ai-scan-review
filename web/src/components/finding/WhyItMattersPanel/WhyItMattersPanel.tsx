import { Typography } from '@forgedevstack/bear';
import { Panel } from '../../common/Panel/Panel';
import { WHY_IT_MATTERS_TITLE } from './WhyItMattersPanel.consts';
import type { WhyItMattersPanelProps } from './WhyItMattersPanel.types';

export const WhyItMattersPanel = ({ finding }: WhyItMattersPanelProps) => (
  <Panel title={WHY_IT_MATTERS_TITLE}>
    <Typography variant="body2" lineHeight="relaxed">
      {finding.whyItMatters}
    </Typography>
  </Panel>
);
