import { SCAN_STATUS, type ScanResult } from '@scan/shared';
import { removeDir, repoDirFor } from '../../common/repo/repoDir';
import type { ScanService } from '../../common/scans/scanService';
import { plural, toMessage } from '../../common/utils/text';
import type { Investigator } from '../investigation/investigator';

const investigationDetail = ({ ai }: ScanResult) =>
  ai.investigated > 0
    ? `${plural(ai.investigated, 'finding')} checked in code, ${ai.changed} re-rated, ${ai.falsePositives} false positive(s)`
    : `AI ${ai.status}${ai.message ? `: ${ai.message}` : ''}`;

/**
 * The AI service's job: read the analyzed findings from MongoDB and the clone from the shared folder,
 * run the agent on every finding, save the final result, then delete the clone.
 */
export class InvestigationRunner {
  constructor(
    private readonly scans: ScanService,
    private readonly investigator: Investigator,
    private readonly reposDir: string,
  ) {}

  async run(scanId: string): Promise<void> {
    const scan = await this.scans.get(scanId).catch((error) => {
      console.error(`Scan ${scanId}: could not load it to investigate`, error);
      return undefined;
    });
    if (!scan?.result) return;

    const status = SCAN_STATUS.INVESTIGATING;
    const repoPath = repoDirFor(this.reposDir, scanId);
    try {
      await this.scans.startStage(scanId, status);
      const result = await this.investigator({
        repo: scan.repo,
        repoPath,
        result: scan.result,
        onProgress: (detail, progress) =>
          void this.scans
            .reportStageProgress(scanId, status, detail, progress)
            .catch((error) => console.error(`Scan ${scanId}: progress update failed`, error)),
      });
      await this.scans.completeStage(scanId, status, investigationDetail(result));
      await this.scans.complete(scanId, result);
    } catch (error) {
      console.error(`Investigation of scan ${scanId} failed`, error);
      await this.scans.fail(scanId, toMessage(error)).catch((failError) => console.error(`Scan ${scanId}: could not save failure`, failError));
    } finally {
      await removeDir(repoPath);
    }
  }
}
