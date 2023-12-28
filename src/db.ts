import { env, exit } from 'process';

import { config as dotenvConfig } from 'dotenv';
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

import { Database } from './types';
import { log } from './log';
import { expandPath } from './util';

// read config (if module loaded outside of app; eg, scripts)
dotenvConfig();

let dataSource;

if (env.DATABASE) {
  dataSource = expandPath(env.DATABASE) ?? dataSource;
  log.info(`Connecting to database: ${dataSource}`);
} else {
  exit(2);
  dataSource = ':memory:';
  log.warn('No DATABASE specified; using in-memory store');
}

const options: SQLite.Options = {};

if (env.DEBUG && !['0', 'no', 'false'].includes(env.DEBUG.toLowerCase())) {
  const verbose_log = (msg: unknown) => log.info(msg);
  options.verbose = verbose_log;
}

const database = new SQLite(dataSource, options);
const dialect = new SqliteDialect({ database });
const db = new Kysely<Database>({ dialect });

export default db;

log.info(`Connected to database ${dataSource}`);
