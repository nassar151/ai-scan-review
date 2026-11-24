import { Link, Typography } from '@forgedevstack/bear';
import { BRAND_ACCENT } from '../../../theme/display.consts';
import { Panel } from '../../common/Panel/Panel';
import { CLASSIFICATION_LABEL, CLASSIFICATION_TITLE, FACT_SEPARATOR, MAX_INLINE_REFERENCES } from './FindingClassification.consts';
import { classificationLine } from './FindingClassification.helpers';
import type { FindingClassificationProps } from './FindingClassification.types';

/** Scanner facts, score factors, rules and references, one line each. */
export const FindingClassification = ({ finding }: FindingClassificationProps) => {
  const extraReferences = finding.references.length - MAX_INLINE_REFERENCES;
  return (
    <Panel title={CLASSIFICATION_TITLE}>
      <Typography variant="body2" weight="semibold">
        {classificationLine(finding)}
      </Typography>
      <Typography variant="caption" color="muted" lineHeight="relaxed">
        {CLASSIFICATION_LABEL.RISK}: {finding.riskFactors.join(FACT_SEPARATOR)}
      </Typography>
      {finding.ruleIds.length > 0 && (
        <Typography variant="caption" color="muted" className="bear-truncate" title={finding.ruleIds.join(', ')}>
          {CLASSIFICATION_LABEL.RULES}: <span className="bear-font-mono">{finding.ruleIds.join(', ')}</span>
        </Typography>
      )}
      {finding.references.length > 0 && (
        <Typography variant="caption" color="muted" className="bear-flex bear-flex-wrap bear-items-center bear-gap-x-3">
          {CLASSIFICATION_LABEL.REFERENCES}:
          {finding.references.slice(0, MAX_INLINE_REFERENCES).map((reference, index) => (
            <Link key={`${index}-${reference.url}`} href={reference.url} external showExternalIcon color={BRAND_ACCENT}>
              {reference.label}
            </Link>
          ))}
          {extraReferences > 0 && <span>+{extraReferences} more</span>}
        </Typography>
      )}
    </Panel>
  );
};
