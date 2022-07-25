import * as db from 'zapatos/db';
import type * as s from 'zapatos/schema';

import { EMOJI_FAIL, EMOJI_OK } from '../constants';
import { getPool } from '../db';
import log from '../log';
import { Err, Ok, Result } from '../types';
import { PluginInit } from './index';

enum KarmaChange {
  Decrement = '--',
  Increment = '++',
  iPhoneSucks = '—',
}

async function bumpKarma(thing: string, change: KarmaChange): Promise<Result<boolean>> {
  log.debug(`increment: ${thing}`);

  try {
    await db.serializable(getPool(), async (txClient) => {
      const record = { thing, value: 0 };
      await db.sql`
        INSERT INTO ${"karma"} (${db.cols(record)}) VALUES (${db.vals(record)})
        ON CONFLICT (${"thing"}) DO NOTHING
      `.run(txClient);

      const op = change === KarmaChange.Increment ? db.sql`+` : db.sql`-`;
      await db.sql<s.karma.SQL, s.karma.Selectable[]>`
        UPDATE ${"karma"} SET ${"value"} = ${"value"} ${op} 1
        WHERE ${{ thing }}
        RETURNING ${"value"}
      `.run(txClient);
    });

    return Ok(true);
  } catch (e: unknown) {
    log.error("Failed to update karma %s for %s: %s", change, thing, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

async function karmaFor(thing: string): Promise<Result<number>> {
  log.debug(`karmaFor: ${thing}`);

  try {
    const row = await db.selectOne('karma', { thing }).run(getPool());
    return row ? Ok(row.value) : Err(`No karma for ${thing}`);
  }
  catch (e: unknown) {
    log.error("Failed to lookup %s: %s", thing, e);
    return Err((e instanceof Error || typeof e === 'string') ? e : String(e));
  }
}

export const init: PluginInit = (pm) => {
  pm.command(
    "karma",
    ["`!karma THING` retrieves the current karma for THING"],
    async ({ rest }, { say }) => {
      if (!rest.some) {
        await say("Usage: `!karma THING`");
        return;
      }

      const thing = rest.value;

      const karma = await karmaFor(thing.trim());
      if (karma.ok && karma.value !== 0) {
        await say(`${thing} has karma ${karma.value}`);
      } else {
        await say(`${thing} has neutral karma`);
      }
    }
  );

  pm.message(
    ["Use `THING++` or `THING--` to adjust change the karma for THING"],
    async ({ payload }) => {
      if (payload.subtype || !payload.text) return;

      const { channel, text, ts: timestamp } = payload;
      const m = text.match(/^\s*(\S+(?:\s\S+)*)\s?(\+\+|--|—)\s*$/);
      if (!(m && m[1] && m[2])) return;

      const result = await bumpKarma(m[1], m[2] as KarmaChange);
      await pm.app.client.reactions.add({
        channel,
        timestamp,
        name: result.ok ? EMOJI_OK : EMOJI_FAIL,
      });
    }
  );
};

export default init;
