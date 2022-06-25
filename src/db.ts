import { Database, open } from 'sqlite';
import { cached } from 'sqlite3';
import { expandPath } from './util';

export { Database } from 'sqlite';

export const DataSource = expandPath(process.env.DATABASE) ?? ":memory:";

if (DataSource === ":memory:") {
  console.warn(
    "No filename specified in DATABASE environment; using in-memory store"
  );
}

let _db: Database;
export const Db = async () => {
  if (!_db) {
    console.log(`Connecting to database ${DataSource}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    _db = await open({ driver: cached.Database, filename: DataSource });
    await _db.migrate();
  }

  return _db;
};
