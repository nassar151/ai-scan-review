import { setTimeout as sleep } from 'node:timers/promises';
import { SCAN_STATUS } from '@scan/shared';
import { analyze } from '../../src/common/analysis/analyze';
import type { PipelineStage } from '../../src/scan-service/pipeline/pipeline.types';
import { buildCodeScan, buildDependencyScan } from './fakeScanOutputs';

/** Fast, network-free scan-service stages that exercise the real runner, service and analysis. */
export const createMockStages = (delayMs: number): PipelineStage[] => [
  {
    status: SCAN_STATUS.CLONING,
    run: async (context) => {
      context.reportProgress('Cloning…');
      await sleep(delayMs);
      context.updateRepo({ ...context.repo, commitSha: 'abc1234def' });
      return { detail: 'Cloned' };
    },
  },
  {
    status: SCAN_STATUS.SCANNING_CODE,
    run: async (context) => {
      await sleep(delayMs);
      context.artifacts.codeScan = buildCodeScan();
      return { detail: '3 files scanned' };
    },
  },
  {
    status: SCAN_STATUS.SCANNING_DEPENDENCIES,
    run: async (context) => {
      await sleep(delayMs);
      context.artifacts.dependencyScan = buildDependencyScan();
      return { detail: '274 dependencies checked' };
    },
  },
  {
    status: SCAN_STATUS.ANALYZING,
    run: async (context) => {
      await sleep(delayMs);
      const { codeScan, dependencyScan, tools, warnings } = context.artifacts;
      context.artifacts.result = analyze({ repo: context.repo, code: codeScan, dependencies: dependencyScan, tools, warnings });
      return { detail: 'Analyzed' };
    },
  },
];
