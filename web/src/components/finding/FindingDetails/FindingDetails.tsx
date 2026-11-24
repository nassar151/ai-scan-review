import { Typography } from '@forgedevstack/bear';
import { AiBadge } from '../../common/AiBadge/AiBadge';
import { DetailSection } from '../../common/DetailSection/DetailSection';
import { Disclosure } from '../../common/Disclosure/Disclosure';
import { Panel } from '../../common/Panel/Panel';
import { AdvisoryCard } from '../AdvisoryCard/AdvisoryCard';
import { AiFixPanel } from '../AiFixPanel/AiFixPanel';
import { CodeLocations } from '../CodeLocations/CodeLocations';
import { DependencyDetails } from '../DependencyDetails/DependencyDetails';
import { FindingClassification } from '../FindingClassification/FindingClassification';
import { ReachabilityFlowPanel } from '../ReachabilityFlowPanel/ReachabilityFlowPanel';
import { SeverityRiskPanel } from '../SeverityRiskPanel/SeverityRiskPanel';
import { WhatToDoPanel } from '../WhatToDoPanel/WhatToDoPanel';
import { WhyItMattersPanel } from '../WhyItMattersPanel/WhyItMattersPanel';
import { MORE_DETAILS_LABEL } from './FindingDetails.consts';
import { whereLocations } from './FindingDetails.helpers';
import type { FindingDetailsProps } from './FindingDetails.types';

/** Open: severity and risk, where + the AI fix, what to do. Everything else sits behind "More details". */
export const FindingDetails = ({ finding }: FindingDetailsProps) => {
  const { investigation } = finding;
  const where = whereLocations(finding);
  const codeFix = investigation?.codeFix;

  return (
    <div className="bear-flex bear-flex-col bear-gap-4">
      <div className="bear-flex bear-flex-wrap bear-items-center bear-gap-3">
        <Typography variant="h6" weight="bold">
          {finding.title}
        </Typography>
        {investigation && <AiBadge />}
      </div>

      <SeverityRiskPanel finding={finding} />

      {(where.length > 0 || codeFix) && (
        <div className={`bear-grid bear-grid-cols-1 bear-gap-4 ${where.length > 0 && codeFix ? 'lg:bear-grid-cols-2' : ''}`}>
          {where.length > 0 && (
            <CodeLocations locations={where} occurrences={finding.locations.length > 0 ? finding.occurrences : where.length} />
          )}
          {investigation && codeFix && <AiFixPanel fix={codeFix} model={investigation.model} />}
        </div>
      )}

      <WhatToDoPanel finding={finding} />

      <Disclosure label={MORE_DETAILS_LABEL}>
        <div className="bear-flex bear-flex-col bear-gap-4 bear-pt-2">
          {(investigation || finding.attackScenario) && <ReachabilityFlowPanel finding={finding} />}
          <WhyItMattersPanel finding={finding} />
          {finding.dependency && <DependencyDetails dependency={finding.dependency} />}
          {!finding.dependency && finding.description !== finding.whyItMatters && (
            <Panel title="What the scanner reported">
              <Typography variant="body2" color="muted" className="bear-whitespace-pre-wrap">
                {finding.description}
              </Typography>
            </Panel>
          )}
          <FindingClassification finding={finding} />
          {finding.dependency && finding.dependency.advisories.length > 0 && (
            <DetailSection title={`Known vulnerabilities (${finding.dependency.advisories.length})`}>
              <div className="bear-grid bear-grid-cols-1 lg:bear-grid-cols-2 bear-gap-3">
                {finding.dependency.advisories.map((advisory) => (
                  <AdvisoryCard key={advisory.id} advisory={advisory} />
                ))}
              </div>
            </DetailSection>
          )}
        </div>
      </Disclosure>
    </div>
  );
};
