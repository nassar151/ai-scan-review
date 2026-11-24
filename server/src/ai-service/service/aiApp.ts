import express from 'express';
import { z } from 'zod';
import { errorHandler, notFoundHandler } from '../../common/http/errorHandler';
import { HTTP_STATUS, HttpError } from '../../common/http/errors';
import type { ScanService } from '../../common/scans/scanService';
import { SERVICE_ROUTES } from '../../common/serviceRoutes.consts';
import type { InvestigationRunner } from './investigationRunner';

interface AiAppDependencies {
  scans: ScanService;
  runner: InvestigationRunner;
}

const startSchema = z.object({ scanId: z.uuid() });

/** The AI service's HTTP API. Only the scan service calls it. */
export const createAiApp = ({ scans, runner }: AiAppDependencies) => {
  const app = express();
  app.use(express.json());

  app.post(SERVICE_ROUTES.INVESTIGATIONS, async (req, res) => {
    const { scanId } = startSchema.parse(req.body ?? {});
    if (!(await scans.get(scanId))?.result) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Scan not found or not analyzed yet');
    }
    void runner.run(scanId);
    res.status(HTTP_STATUS.ACCEPTED).end();
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
