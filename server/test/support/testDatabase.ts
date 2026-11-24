import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { inject } from 'vitest';
import { ensureIndexes } from '../../src/common/db/database';
import type { Database } from '../../src/common/db/database.types';

/** A fresh database on the run's in-memory MongoDB server, with the production indexes. */
export const createTestDatabase = async (): Promise<Database> => {
  const client = await MongoClient.connect(inject('mongoUri'), { ignoreUndefined: true });
  const db = client.db(`test_${randomUUID()}`);
  await ensureIndexes(db);
  return { db, close: () => client.close() };
};
