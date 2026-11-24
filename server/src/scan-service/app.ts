import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from '../common/http/errorHandler';
import type { ScanService } from '../common/scans/scanService';
import { SERVICE_ROUTES } from '../common/serviceRoutes.consts';
import type { ScanRunner } from './pipeline/scanRunner';
import { createInternalRouter } from './routes/internal.routes';
import { createScansRouter } from './routes/scans.routes';

interface AppDependencies {
  scans: ScanService;
  runner: ScanRunner;
}

/** The scan service's HTTP API: the public `/api` for the UI, plus internal calls from the AI service. */
export const createApp = ({ scans, runner }: AppDependencies) => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/scans', createScansRouter(scans, runner));
  app.use(SERVICE_ROUTES.INTERNAL, createInternalRouter(scans));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
