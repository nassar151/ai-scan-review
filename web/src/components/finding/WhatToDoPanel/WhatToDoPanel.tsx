import { Typography } from '@forgedevstack/bear';
import { Panel } from '../../common/Panel/Panel';
import { WHAT_TO_DO_TITLE } from './WhatToDoPanel.consts';
import type { WhatToDoPanelProps } from './WhatToDoPanel.types';

export const WhatToDoPanel = ({ finding }: WhatToDoPanelProps) => (
  <Panel title={WHAT_TO_DO_TITLE}>
    <Typography variant="body2" weight="semibold" lineHeight="relaxed">
      {finding.recommendedAction}
    </Typography>
    {finding.fixSteps.length > 0 && (
      <ol className="bear-flex bear-flex-col bear-gap-1 bear-list-decimal bear-pl-5">
        {finding.fixSteps.map((step, index) => (
          <li key={`${index}-${step}`}>
            <Typography variant="body2" lineHeight="relaxed">
              {step}
            </Typography>
          </li>
        ))}
      </ol>
    )}
  </Panel>
);
