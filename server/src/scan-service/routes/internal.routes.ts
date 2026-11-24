import { Router } from 'express';
import { HTTP_STATUS, HttpError } from '../../common/http/errors';
import type { ScanService } from '../../common/scans/scanService';
import { SERVICE_ROUTES } from '../../common/serviceRoutes.consts';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Calls from the AI service. Accepted from this machine only. */
export const createInternalRouter = (scans: ScanService) => {
  const router = Router();

  router.use((req, _res, next) => {
    if (!LOOPBACK_ADDRESSES.has(req.socket.remoteAddress ?? '')) {
      throw new HttpError(HTTP_STATUS.FORBIDDEN, 'Internal route');
    }
    next();
  });

  router.post(SERVICE_ROUTES.SCAN_CHANGED, async (req, res) => {
    await scans.refresh(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).end();
  });

  return router;
};
