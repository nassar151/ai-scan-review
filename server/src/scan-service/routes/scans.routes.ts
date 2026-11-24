import { Router } from 'express';
import { z } from 'zod';
import { HTTP_STATUS, HttpError } from '../../common/http/errors';
import type { ScanService } from '../../common/scans/scanService';
import { parseGithubUrl } from '../github/githubUrl';
import type { ScanRunner } from '../pipeline/scanRunner';
import { streamScanEvents } from './scanEvents';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

const createScanSchema = z.object({
  repoUrl: z.string().trim().min(1, 'repoUrl is required'),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).default(DEFAULT_LIST_LIMIT),
});

export const createScansRouter = (scans: ScanService, runner: ScanRunner) => {
  const router = Router();

  router.post('/', async (req, res) => {
    const { repoUrl } = createScanSchema.parse(req.body ?? {});
    const scan = await scans.create(parseGithubUrl(repoUrl));
    void runner.start(scan.id);
    res.status(HTTP_STATUS.ACCEPTED).location(`/api/scans/${scan.id}`).json(scan);
  });

  router.get('/', async (req, res) => {
    const { limit } = listQuerySchema.parse(req.query);
    res.json(await scans.list(limit));
  });

  router.get('/:id/events', streamScanEvents(scans));

  router.get('/:id', async (req, res) => {
    const scan = await scans.get(req.params.id);
    if (!scan) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Scan not found');
    }
    res.json(scan);
  });

  return router;
};
