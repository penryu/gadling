import { Database, Db } from '../src/db';

void (async () => {
  const conn: Database = await Db(true);
  await conn.migrate();
  await conn.close();
})();
