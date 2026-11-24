import path from 'node:path';

const DEFAULT_PORT = 4000;
const DEFAULT_AI_PORT = 4001;
const DEFAULT_MAX_REPO_SIZE_MB = 500;
const LOCALHOST = '127.0.0.1';
const REPOS_FOLDER = 'repos';
const DEFAULT_DATABASE_URL = 'mongodb://127.0.0.1:27017/ai_scan_review';

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const port = numberFromEnv(process.env.PORT, DEFAULT_PORT);
const aiPort = numberFromEnv(process.env.AI_PORT, DEFAULT_AI_PORT);
const dataDir = path.resolve(process.env.DATA_DIR ?? './data');
const databaseUrl = process.env.MONGODB_URL ?? DEFAULT_DATABASE_URL;

/** host:port/database, without the password, for startup logs. */
const databaseLabel = (url: string) => {
  const { protocol, host, pathname } = new URL(url);
  return `${protocol}//${host}${pathname}`;
};

export const config = {
  port,
  aiPort,
  host: LOCALHOST,
  scanServiceUrl: process.env.SCAN_SERVICE_URL ?? `http://${LOCALHOST}:${port}`,
  aiServiceUrl: process.env.AI_SERVICE_URL ?? `http://${LOCALHOST}:${aiPort}`,
  databaseUrl,
  databaseLabel: databaseLabel(databaseUrl),
  /** Clones live here, one folder per scan, so both services can read them. */
  reposDir: path.join(dataDir, REPOS_FOLDER),
  githubToken: process.env.GITHUB_TOKEN ?? '',
  maxRepoSizeMb: numberFromEnv(process.env.MAX_REPO_SIZE_MB, DEFAULT_MAX_REPO_SIZE_MB),
} as const;
