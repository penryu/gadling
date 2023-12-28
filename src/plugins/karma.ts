import { sql } from 'kysely';

import { Emoji } from '../constants';
import db from '../db';
import log from '../log';
import { Err, Ok, Result } from '../types';

import { PluginInit } from './index';

enum KarmaChange {
  Decrement = '--',
  Increment = '++',
  iPhoneSucks = '—',
}

async function bumpKarma(
  thing: string,
  change: KarmaChange,
): Promise<Result<null>> {
  log.debug(`karma bump ${thing}`);

  const op = change === KarmaChange.Increment ? sql`+` : sql`-`;

  try {
    await db.transaction().execute(async (tx) => {
      await tx
        .insertInto('karma')
        .values({ thing, value: 0 })
        .onConflict((oc) => oc.column('thing').doNothing())
        .executeTakeFirstOrThrow();

      return await tx
        .updateTable('karma')
        .set({ value: sql`value ${op} 1` })
        .where('thing', '=', thing)
        .returning('value')
        .executeTakeFirstOrThrow();
    });

    return Ok(null);
  } catch (e: unknown) {
    log.error('Failed to update karma %s for %s: %s', change, thing, e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

async function karmaFor(thing: string): Promise<Result<number>> {
  log.debug(`karmaFor: ${thing}`);

  try {
    const row = await db
      .selectFrom('karma')
      .select('value')
      .where('thing', '=', thing)
      .executeTakeFirstOrThrow();
    return row ? Ok(row.value) : Err(`No karma for ${thing}`);
  } catch (e: unknown) {
    log.error('Failed to lookup %s: %s', thing, e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

export const init: PluginInit = (pm) => {
  pm.command(
    'karma',
    {
      section: 'karma',
      command: '!karma THING',
      description: 'retrieves the current karma for THING',
      examples: ['`!karma pizza`'],
    },
    async ({ rest }, { say }) => {
      if (!rest.some) {
        await say('Usage: `!karma THING`');
        return;
      }

      const thing = rest.value;

      const karma = await karmaFor(thing.trim());
      await say(
        karma.ok && karma.value !== 0
          ? `${thing} has karma ${karma.value}`
          : `${thing} has neutral karma`,
      );
    },
  );

  pm.message(
    {
      section: 'karma',
      description:
        'Use `THING++` or `THING--` to passively adjust change the karma for THING',
      examples: ['`cardio--`', '`gnocchi++`'],
    },
    async ({ payload }) => {
      if (payload.subtype || !payload.text) return;

      const { channel, text, ts: timestamp } = payload;
      const m = text.match(/^\s*(\S+(?:\s\S+)*)\s?(\+\+|--|—)\s*$/);
      if (!(m && m[1] && m[2])) return;

      const result = await bumpKarma(m[1], m[2] as KarmaChange);
      await pm.app.client.reactions.add({
        channel,
        timestamp,
        name: result.ok ? Emoji.OK : Emoji.FAIL,
      });
    },
  );
};

export default init;
