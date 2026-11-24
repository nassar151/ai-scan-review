import { AI_STATUS, SCAN_STATUS, type ScanResult } from '@scan/shared';
import type { ScanService } from '../../common/scans/scanService';
import { toMessage } from '../../common/utils/text';
import type { InvestigationClient, PipelineContext, PipelineStage } from './pipeline.types';

const MISSING_RESULT_MESSAGE = 'Analysis finished without producing a result';
const AI_SERVICE_DOWN = 'AI service unavailable';

const withoutAi = (result: ScanResult, message: string): ScanResult => ({
  ...result,
  ai: { status: AI_STATUS.FAILED, message, investigated: 0, changed: 0, falsePositives: 0, failed: 0 },
  warnings: [...result.warnings, message],
});

/** Runs clone → scan → analyze in the background, then hands the scan to the AI service. */
export class ScanRunner {
  constructor(
    private readonly scans: ScanService,
    private readonly stages: PipelineStage[],
    private readonly investigations: InvestigationClient,
  ) {}

  /** Fire-and-forget: callers get the scan id immediately and follow progress via the API. */
  async start(scanId: string): Promise<void> {
    const scan = await this.scans.get(scanId).catch((error) => {
      console.error(`Scan ${scanId}: could not load it to start`, error);
      return undefined;
    });
    if (!scan) return;

    const cleanupTasks: Array<() => Promise<void>> = [];
    let currentStatus = scan.status;
    let repo = scan.repo;
    let handedOff = false;
    /** Progress updates don't block the stage; ScanService saves them in order. */
    const inBackground = (update: Promise<unknown>) =>
      void update.catch((error) => console.error(`Scan ${scanId}: progress update failed`, error));
    const context: PipelineContext = {
      scanId,
      get repo() {
        return repo;
      },
      artifacts: { tools: [], warnings: [] },
      updateRepo: (next) => {
        repo = next;
        inBackground(this.scans.updateRepo(scanId, next));
      },
      reportProgress: (detail, progress) =>
        inBackground(this.scans.reportStageProgress(scanId, currentStatus, detail, progress)),
      onCleanup: (task) => cleanupTasks.push(task),
    };

    try {
      for (const stage of this.stages) {
        currentStatus = stage.status;
        await this.scans.startStage(scanId, stage.status);
        const outcome = await stage.run(context);
        if (outcome.skipped) {
          await this.scans.skipStage(scanId, stage.status, outcome.detail ?? 'Skipped');
        } else {
          await this.scans.completeStage(scanId, stage.status, outcome.detail);
        }
      }

      const { result } = context.artifacts;
      if (!result) {
        throw new Error(MISSING_RESULT_MESSAGE);
      }
      await this.scans.saveResult(scanId, result);
      handedOff = await this.handOff(scanId, result);
    } catch (error) {
      console.error(`Scan ${scanId} failed`, error);
      await this.scans.fail(scanId, toMessage(error)).catch((failError) => console.error(`Scan ${scanId}: could not save failure`, failError));
    } finally {
      if (!handedOff) {
        await Promise.allSettled(cleanupTasks.map((task) => task()));
      }
    }
  }

  /** From here the AI service owns the scan and its clone. If it can't be reached, finish without AI. */
  private async handOff(scanId: string, result: ScanResult): Promise<boolean> {
    try {
      await this.investigations.start(scanId);
      return true;
    } catch (error) {
      const message = `${AI_SERVICE_DOWN}: ${toMessage(error)}`;
      console.error(`Scan ${scanId}: ${message}`);
      await this.scans.skipStage(scanId, SCAN_STATUS.INVESTIGATING, message);
      await this.scans.complete(scanId, withoutAi(result, message));
      return false;
    }
  }
}
