import { MongoClient, type Db } from 'mongodb';
import { INDEXES } from './database.consts';
import type { Database } from './database.types';

/** Optional scan fields that are not set are left out of the document instead of being stored as null. */
export const connectDatabase = async (url: string): Promise<Database> => {
  const client = await MongoClient.connect(url, { ignoreUndefined: true });
  return { db: client.db(), close: () => client.close() };
};

/** Creates the indexes if missing. Safe to run from both services at once. */
export const ensureIndexes = async (db: Db) => {
  await Promise.all(Object.entries(INDEXES).map(([name, indexes]) => db.collection(name).createIndexes(indexes)));
};
