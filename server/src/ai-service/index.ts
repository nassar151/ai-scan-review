import { config } from '../common/config';
import { connectDatabase, ensureIndexes } from '../common/db/database';
import { ScanService } from '../common/scans/scanService';
import { MongoScanStore } from '../common/store/mongoScanStore';
import { createInvestigator } from './investigation/investigator';
import { resolveLlmSettings } from './llm/resolveLlmSettings';
import { createAiApp } from './service/aiApp';
import { InvestigationRunner } from './service/investigationRunner';
import { createScanChangeNotifier } from './service/scanChangeNotifier';

/** AI service: investigates analyzed scans. Shares MongoDB and the clone folder with the scan service. */
const llm = resolveLlmSettings(process.env);
const { db } = await connectDatabase(config.databaseUrl);
await ensureIndexes(db);
const scans = new ScanService(new MongoScanStore(db));
const notifyScanChanged = createScanChangeNotifier(config.scanServiceUrl);
scans.subscribe((scan) => notifyScanChanged(scan.id));

const runner = new InvestigationRunner(scans, createInvestigator(llm), config.reposDir);

createAiApp({ scans, runner }).listen(config.aiPort, config.host, () => {
  console.log(`AI service listening on http://${config.host}:${config.aiPort}`);
  if (llm.apiKey) {
    console.log(`AI: ${llm.label} · ${llm.model} (${llm.agentConcurrency} agent(s) in parallel)`);
  } else {
    console.warn(`AI is off: no API key for ${llm.label} (set AI_API_KEY or ${llm.keyEnv}). Scans use the built-in ratings and texts.`);
  }
});
