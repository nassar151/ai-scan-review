import { Typography } from '@forgedevstack/bear';
import { DetailSection } from '../../common/DetailSection/DetailSection';
import { MetaItem } from '../../common/MetaItem/MetaItem';
import { Pill } from '../../common/Pill/Pill';
import { CHAIN_SEPARATOR, NO_FIX_LABEL, RELATIONSHIP_LABEL } from './DependencyDetails.consts';
import type { DependencyDetailsProps } from './DependencyDetails.types';

const relationshipLabel = (isDirect: boolean | undefined) => {
  if (isDirect === undefined) return RELATIONSHIP_LABEL.UNKNOWN;
  return isDirect ? RELATIONSHIP_LABEL.DIRECT : RELATIONSHIP_LABEL.INDIRECT;
};

export const DependencyDetails = ({ dependency }: DependencyDetailsProps) => (
  <DetailSection title="Affected package">
    <div className="bear-grid bear-grid-cols-2 md:bear-grid-cols-3 bear-gap-3">
      <MetaItem label="Package">
        <span className="bear-font-mono">{dependency.packageName}</span>
      </MetaItem>
      <MetaItem label="Installed version">
        <span className="bear-font-mono">{dependency.installedVersion}</span>
      </MetaItem>
      <MetaItem label="Upgrade to">
        {dependency.fixedVersion ? (
          <span className="bear-inline-flex bear-items-center bear-gap-2">
            <span className="bear-font-mono">{dependency.fixedVersion}</span>
            {dependency.upgradeType && (
              <Pill variant="neutral">{dependency.upgradeType}</Pill>
            )}
          </span>
        ) : (
          NO_FIX_LABEL
        )}
      </MetaItem>
      <MetaItem label="Relationship">
        {relationshipLabel(dependency.isDirect)}
      </MetaItem>
      <MetaItem label="Environment">
        {dependency.isDev ? 'Dev only (not shipped to production)' : 'Production (ships with the app)'}
      </MetaItem>
      <MetaItem label="Ecosystem">{dependency.ecosystem}</MetaItem>
    </div>

    {dependency.introducedVia.length > 0 && (
      <MetaItem label="How it gets into your project">
        <ul className="bear-flex bear-flex-col bear-gap-1">
          {dependency.introducedVia.map((chain) => (
            <li key={chain.join(CHAIN_SEPARATOR)} className="bear-font-mono bear-text-xs">
              {chain.join(CHAIN_SEPARATOR)}
            </li>
          ))}
        </ul>
      </MetaItem>
    )}

    {dependency.manifests.length > 0 && (
      <Typography variant="caption" color="muted">
        Found in {dependency.manifests.join(', ')}
      </Typography>
    )}
  </DetailSection>
);
