import type { Db } from 'mongodb';

/** The MongoDB database both services share, and a way to close its connection. */
export interface Database {
  db: Db;
  close(): Promise<void>;
}
