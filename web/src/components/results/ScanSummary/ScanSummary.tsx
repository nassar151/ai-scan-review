import { Typography } from '@forgedevstack/bear';
import { FINDING_TYPE_META } from '../../../theme/display.consts';
import { plural } from '../../../utils/text';
import { Pill } from '../../common/Pill/Pill';
import { FINDING_TYPE_COUNT_LABELS, NO_FINDINGS_LABEL } from './ScanSummary.consts';
import type { ScanSummaryProps } from './ScanSummary.types';

export const ScanSummary = ({ result: { stats, typeCounts, findings } }: ScanSummaryProps) => (
  <div className="bear-flex bear-flex-col bear-gap-2">
    <Typography color="muted">
      Scanned <strong>{plural(stats.filesScanned, 'file')}</strong> and{' '}
      <strong>{plural(stats.dependenciesScanned, 'dependency')}</strong>.
    </Typography>
    <div className="bear-flex bear-flex-wrap bear-items-center bear-gap-2">
      <Typography weight="semibold">{findings.length > 0 ? `${plural(findings.length, 'finding')}:` : NO_FINDINGS_LABEL}</Typography>
      {FINDING_TYPE_COUNT_LABELS.filter(({ type }) => typeCounts[type] > 0).map(({ type, word }) => (
        <Pill key={type} variant={FINDING_TYPE_META[type].variant}>
          {plural(typeCounts[type], word)}
        </Pill>
      ))}
    </div>
  </div>
);
