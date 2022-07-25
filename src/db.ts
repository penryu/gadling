import { env } from 'process';
import * as pg from 'pg';

let pool: pg.Pool;

export const getPool = (): pg.Pool => {
  if (!pool) {
    const connectionString = env.DATABASE_URL;
    pool = new pg.Pool({ connectionString });
  }

  return pool;
}
