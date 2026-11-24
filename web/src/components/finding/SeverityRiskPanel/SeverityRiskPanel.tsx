import { Typography } from '@forgedevstack/bear';
import { Panel } from '../../common/Panel/Panel';
import { RatingBadges } from '../RatingBadges/RatingBadges';
import { RATING_ARROW, SEVERITY_RISK_TEXT } from './SeverityRiskPanel.consts';
import { ratingChanged } from './SeverityRiskPanel.helpers';
import type { SeverityRiskPanelProps } from './SeverityRiskPanel.types';

/** The final rating first; when the AI moved it, the old rating and the one-line reason why. */
export const SeverityRiskPanel = ({ finding }: SeverityRiskPanelProps) => {
  const { investigation } = finding;
  const changed = investigation !== undefined && ratingChanged(finding, investigation);

  return (
    <Panel title={SEVERITY_RISK_TEXT.TITLE} tone="highlight">
      {investigation && (
        <Typography variant="caption" weight="semibold" color="muted">
          {changed ? SEVERITY_RISK_TEXT.CHANGED : SEVERITY_RISK_TEXT.CONFIRMED}
        </Typography>
      )}
      <div className="bear-flex bear-flex-wrap bear-items-center bear-gap-3">
        {changed && (
          <>
            <RatingBadges
              severity={investigation.originalSeverity}
              riskScore={investigation.originalRiskScore}
              priority={investigation.originalPriority}
              muted
            />
            <span aria-hidden className="bear-text-lg bear-text-primary-700">
              {RATING_ARROW}
            </span>
          </>
        )}
        <RatingBadges severity={finding.severity} riskScore={finding.riskScore} priority={finding.priority} />
      </div>
      <Typography variant="body2" weight="semibold" lineHeight="relaxed">
        {investigation?.changeReason ?? finding.severityReason}
      </Typography>
      {investigation?.riskScoreReason && (
        <Typography variant="body2" lineHeight="relaxed">
          {SEVERITY_RISK_TEXT.RISK_SCORE} {investigation.originalRiskScore} {RATING_ARROW} {finding.riskScore}:{' '}
          {investigation.riskScoreReason}
        </Typography>
      )}
      {changed && (
        <Typography variant="caption" color="muted" lineHeight="relaxed">
          {SEVERITY_RISK_TEXT.SCANNER_REASON}: {investigation.originalSeverityReason}
        </Typography>
      )}
      {investigation?.changeRejected && (
        <Typography variant="caption" color="muted">
          {investigation.changeRejected}
        </Typography>
      )}
    </Panel>
  );
};
