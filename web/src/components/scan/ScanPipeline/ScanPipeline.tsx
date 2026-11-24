import { Typography } from '@forgedevstack/bear';
import { PIPELINE_STATE_META, SCAN_STATUS_META } from '../../../theme/display.consts';
import { durationBetween } from '../../../utils/format';
import { Pill } from '../../common/Pill/Pill';
import { PipelineStageNode } from '../PipelineStageNode/PipelineStageNode';
import type { ScanPipelineProps } from './ScanPipeline.types';

/** Horizontal CI/CD-style view of the scan stages: one job per stage, connected left to right. */
export const ScanPipeline = ({ scan }: ScanPipelineProps) => (
  <section className="bear-flex bear-flex-col bear-gap-3">
    <div className="bear-flex bear-flex-wrap bear-items-center bear-gap-2">
      <Typography variant="overline" color="muted">
        Scan pipeline
      </Typography>
      <Pill variant={SCAN_STATUS_META[scan.status].variant}>{SCAN_STATUS_META[scan.status].label}</Pill>
      {scan.finishedAt && (
        <Typography variant="caption" color="muted" className="bear-font-mono">
          total {durationBetween(scan.startedAt ?? scan.createdAt, scan.finishedAt)}
        </Typography>
      )}
    </div>

    <ol className="bear-flex bear-flex-col md:bear-flex-row bear-gap-2">
      {scan.stages.map((stage, index) => {
        const previous = scan.stages[index - 1];
        return (
          <li key={stage.status} className="bear-flex bear-items-center bear-gap-2 md:bear-flex-1 bear-min-w-0">
            {previous && (
              <span
                aria-hidden
                className="bear-hidden md:bear-block bear-w-4 bear-h-px bear-shrink-0"
                style={{ backgroundColor: PIPELINE_STATE_META[previous.state].color }}
              />
            )}
            <PipelineStageNode stage={stage} />
          </li>
        );
      })}
    </ol>
  </section>
);
