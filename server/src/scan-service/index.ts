import fs from 'node:fs';
import { config } from '../common/config';
import { connectDatabase, ensureIndexes } from '../common/db/database';
import { ScanService } from '../common/scans/scanService';
import { MongoScanStore } from '../common/store/mongoScanStore';
import { createApp } from './app';
import { createAiServiceClient } from './pipeline/aiServiceClient';
import { ScanRunner } from './pipeline/scanRunner';
import { createScanStages } from './pipeline/stages';

const INTERRUPTED_MESSAGE = 'Interrupted by server restart';

/** Scan service: public API, SSE, and the clone → scan → analyze pipeline. */
const { db } = await connectDatabase(config.databaseUrl);
await ensureIndexes(db);
const store = new MongoScanStore(db);
const interrupted = await store.failInterrupted(INTERRUPTED_MESSAGE);
if (interrupted > 0) {
  console.warn(`Marked ${interrupted} interrupted scan(s) as failed.`);
}
fs.rmSync(config.reposDir, { recursive: true, force: true });

const scans = new ScanService(store);
const runner = new ScanRunner(
  scans,
  createScanStages({
    githubToken: config.githubToken,
    maxRepoSizeMb: config.maxRepoSizeMb,
    reposDir: config.reposDir,
  }),
  createAiServiceClient(config.aiServiceUrl),
);

createApp({ scans, runner }).listen(config.port, () => {
  console.log(`Scan service listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.databaseLabel} · AI service: ${config.aiServiceUrl}`);
});
