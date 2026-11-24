import { Card, Link, Typography } from '@forgedevstack/bear';
import { BRAND_ACCENT } from '../../../theme/display.consts';
import { formatDate } from '../../../utils/format';
import { Disclosure } from '../../common/Disclosure/Disclosure';
import { MetaItem } from '../../common/MetaItem/MetaItem';
import { Pill } from '../../common/Pill/Pill';
import { SeverityBadge } from '../../common/SeverityBadge/SeverityBadge';
import type { AdvisoryCardProps } from './AdvisoryCard.types';

export const AdvisoryCard = ({ advisory }: AdvisoryCardProps) => {
  const primaryIds = advisory.cveIds.length > 0 ? advisory.cveIds : [advisory.id];
  return (
    <Card variant="outlined" padding="md">
      <div className="bear-flex bear-flex-col bear-gap-3">
        <div className="bear-flex bear-items-start bear-justify-between bear-gap-3">
          <div className="bear-flex bear-flex-col bear-gap-1 bear-min-w-0">
            <div className="bear-flex bear-flex-wrap bear-items-center bear-gap-2">
              {primaryIds.map((id) => (
                <Typography key={id} weight="bold" className="bear-font-mono">
                  {id}
                </Typography>
              ))}
              {advisory.cveIds.length > 0 && (
                <Pill variant="secondary">{advisory.id}</Pill>
              )}
            </div>
            <Typography variant="body2">{advisory.title}</Typography>
          </div>
          <SeverityBadge severity={advisory.severity} score={advisory.cvssScore} />
        </div>

        <MetaItem label="Why this severity">
          {advisory.severityReason}
          {advisory.cvssVector && (
            <Typography variant="caption" color="muted" component="div" className="bear-font-mono bear-break-all">
              {advisory.cvssVector}
            </Typography>
          )}
        </MetaItem>

        <div className="bear-grid bear-grid-cols-2 md:bear-grid-cols-3 bear-gap-3">
          <MetaItem label="Fixed in">{advisory.fixedVersion ?? 'No fixed version published'}</MetaItem>
          <MetaItem label="Weakness">{advisory.cwe.length > 0 ? advisory.cwe.join(', ') : '—'}</MetaItem>
          <MetaItem label="Published">{advisory.publishedAt ? formatDate(advisory.publishedAt) : '—'}</MetaItem>
        </div>

        {advisory.description && (
          <Disclosure label="Original advisory text">
            <Typography variant="body2" color="muted" className="bear-whitespace-pre-wrap">
              {advisory.description}
            </Typography>
          </Disclosure>
        )}

        <Link href={advisory.url} external showExternalIcon color={BRAND_ACCENT}>
          Open advisory {advisory.id}
        </Link>
      </div>
    </Card>
  );
};
