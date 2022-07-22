import { EMOJI_FAIL, EMOJI_OK } from '../constants';
import { Db } from '../db';
import log from '../log';
import { Err, Ok, Result } from '../types';
import { PluginInit } from './index';

interface KarmaRow {
  thing: string;
  value: number;
}

enum KarmaChange {
  Decrement = '--',
  Increment = '++',
  iPhoneSucks = '—',
}

const KarmaStatements: Record<KarmaChange, string> = {
  [KarmaChange.Decrement]: `UPDATE karma SET value = value - 1 WHERE thing = ?`,
  [KarmaChange.Increment]: `UPDATE karma SET value = value + 1 WHERE thing = ?`,
  [KarmaChange.iPhoneSucks]: `UPDATE karma SET value = value - 1 WHERE thing = ?`,
};

async function bumpKarma(thing: string, change: KarmaChange): Promise<Result<number>> {
  log.debug(`increment: ${thing}`);

  try {
    const db = await Db();
    await db.run('INSERT OR IGNORE INTO karma (thing) VALUES (?)', thing);
    const update = await db.run(KarmaStatements[change], thing);
    const { changes, stmt } = update;

    log.debug({ thing, change, stmt, changes });
    return (changes && changes > 0)
      ? Ok(changes)
      : Err(`No change: ${thing}${change}`);
  }
  catch (e: unknown) {
    log.error("Failed to update karma %s for %s: %s", change, thing, e);
    return Err((e instanceof Error || typeof e === 'string') ? e : String(e));
  }
}

async function karmaFor(thing: string): Promise<Result<number>> {
  log.debug(`karmaFor: ${thing}`);

  try {
    const db = await Db();
    const row = await db.get<KarmaRow>(
      `SELECT value FROM karma WHERE thing = ?`,
      thing
    );
    return row ? Ok(row.value) : Err(`No karma for ${thing}`);
  }
  catch (e: unknown) {
    log.error("Failed to lookup %s: %s", thing, e);
    return Err((e instanceof Error || typeof e === 'string') ? e : String(e));
  }
}

export const init: PluginInit = (pm) => {
  pm.command("karma", ["FIXME"], async ({ rest }, { say }) => {
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
  });

  pm.message(["FIXME"], async ({ payload }) => {
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
  });
};

export default init;
