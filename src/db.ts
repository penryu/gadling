import os from 'os';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { Database, open } from 'sqlite';
import * as sqlite3 from 'sqlite3';

import { log } from './log';
import { expandPath } from './util';

// read config (if module loaded outside of app; eg, scripts)
dotenvConfig({ path: path.join(os.homedir(), ".config/hob/config") });

// re-export Database type from sqlite wrapper
export { Database } from 'sqlite';

let DataSource = ":memory:";
let conn: Database;

export async function Db(debug = true): Promise<Database> {
  if (!conn) {
    const { env } = process;

    if (env.DATABASE) {
      DataSource = expandPath(env.DATABASE) ?? DataSource;
    }

    if (DataSource === ":memory:") {
      log.warn("No DATABASE specified; using in-memory store");
    }

    // eslint-disable-next-line @typescript-eslint/unbound-method
    conn = await open({ driver: sqlite3.cached.Database, filename: DataSource });
    log.info(`Connected to database ${DataSource}`);

    if (debug || env.DEBUG) {
      sqlite3.verbose();
      conn.on('trace', (data: unknown) => log.trace('trace', data));
    }

    await conn.migrate();
  }

  return conn;
}
