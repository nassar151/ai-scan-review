import { Alert, Card, CardBody, Divider, Tooltip, Typography } from '@forgedevstack/bear';
import { RISK_SCORE_MAX } from '@scan/shared';
import { AI_STATUS_META, BRAND_ACCENT, GRADE_META } from '../../../theme/display.consts';
import { GradeBadge } from '../../common/GradeBadge/GradeBadge';
import { Pill } from '../../common/Pill/Pill';
import { ScanPipeline } from '../../scan/ScanPipeline/ScanPipeline';
import { ScanSummary } from '../ScanSummary/ScanSummary';
import type { ResultsOverviewProps } from './ResultsOverview.types';

export const ResultsOverview = ({ scan, result }: ResultsOverviewProps) => {
  const aiMeta = AI_STATUS_META[result.ai.status];
  const aiTooltip = [result.ai.model, result.ai.message].filter(Boolean).join(' · ') || aiMeta.label;

  return (
    <Card padding="lg" className="bear-border-t-4" style={{ borderTopColor: BRAND_ACCENT }}>
      <CardBody className="bear-flex bear-flex-col bear-gap-5">
        <div className="bear-flex bear-flex-col md:bear-flex-row bear-gap-6">
          <div className="bear-flex md:bear-flex-col bear-items-center bear-gap-3 bear-shrink-0">
            <GradeBadge grade={result.grade} size="lg" />
            <div className="bear-flex bear-flex-col md:bear-items-center">
              <Typography variant="subtitle2" weight="semibold">
                {GRADE_META[result.grade].label}
              </Typography>
              <Typography variant="caption" color="muted">
                Top risk {result.riskScore}/{RISK_SCORE_MAX}
              </Typography>
            </div>
          </div>
          <div className="bear-flex bear-flex-col bear-gap-3 bear-min-w-0">
            <div className="bear-flex bear-items-start bear-justify-between bear-gap-3">
              <Typography variant="h5" weight="bold">
                {result.headline}
              </Typography>
              <Tooltip content={aiTooltip}>
                <Pill variant={aiMeta.variant}>{aiMeta.label}</Pill>
              </Tooltip>
            </div>
            <ScanSummary result={result} />
          </div>
        </div>

        <Divider />
        <ScanPipeline scan={scan} />

        {result.warnings.length > 0 && (
          <Alert severity="warning" title="Notes from this scan">
            <ul className="bear-flex bear-flex-col bear-gap-1 bear-list-disc bear-pl-5">
              {result.warnings.map((warning, index) => (
                <li key={`${index}-${warning}`}>{warning}</li>
              ))}
            </ul>
          </Alert>
        )}
      </CardBody>
    </Card>
  );
};
