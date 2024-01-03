import { SayFn } from '@slack/bolt';
import { sql } from 'kysely';
import db from '../db';
import { Emoji } from '../constants';
import log from '../log';
import { Err, None, Ok, Option, Result, Some } from '../types';
import { selectFrom } from '../util';
import { PluginInit } from './index';

interface FactRecord {
  thing: string;
  fact: string;
  inactive?: boolean;
}

interface FactDump {
  active: Array<Record<string, string>>;
  inactive: Array<Record<string, string>>;
}

const RE_passive_fetch = /^\s*(?:what|who) (is|are) (.+?)\??\s*$/i;
const RE_passive_learn = /^\s*(.+?)\s+(?:is|are)\s+(.+)\s*$/i;

export async function dump(): Promise<Result<Array<FactRecord>>> {
  log.debug(`dump`);

  try {
    const rows = await db
      .selectFrom('facts')
      .select(['thing', 'fact', 'inactive'])
      .orderBy(['thing', 'fact', 'inactive'])
      .limit(500)
      .execute();
    return Ok(rows);
  } catch (e: unknown) {
    log.error('Failed to collect factdump: %s', e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

export async function forget(
  thing: string,
  fact: string,
): Promise<Result<number>> {
  log.debug(`forget: ${thing} := ${fact}`);

  try {
    const changes = await db
      .updateTable('facts')
      .set({ inactive: sql`TRUE` })
      .where('thing', '=', thing)
      .where('fact', '=', fact)
      .execute();
    return Ok(changes.length);
  } catch (e: unknown) {
    log.error('Failed to delete [%s == %s]: %s', thing, fact, e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

export async function forgetAll(thing: string): Promise<Result<number>> {
  log.debug(`forgetAll: ${thing}`);

  try {
    const changes = await db
      .updateTable('facts')
      .set({ inactive: sql`TRUE` })
      .where('thing', '=', thing)
      .execute();
    return Ok(changes.length);
  } catch (e: unknown) {
    log.error('Failed to delete facts for %s: %s', thing, e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

async function learn(thing: string, fact: string): Promise<Result<number>> {
  log.debug(`learn: ${thing} := ${fact}`);

  try {
    await db
      .insertInto('facts')
      .values({ thing, fact, inactive: sql`FALSE` })
      .onConflict((oc) =>
        oc.columns(['thing', 'fact']).doUpdateSet({ inactive: sql`FALSE` }),
      )
      .execute();

    return Ok(0);
  } catch (e: unknown) {
    log.error('Failed to insert %s == %s: %s', thing, fact, e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

async function lookup(thing: string): Promise<Result<Array<string>>> {
  log.debug(`lookup: ${thing}`);

  try {
    const records = await db
      .selectFrom('facts')
      .select('fact')
      .where('thing', '=', thing)
      .where('inactive', '=', sql`FALSE`)
      .orderBy('fact')
      .limit(100)
      .execute();

    return records.length > 0
      ? Ok(records.map((r) => r.fact))
      : Err('no matching facts');
  } catch (e: unknown) {
    log.error('Failed to lookup %s: %s', thing, e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

async function search(
  term: string,
): Promise<Result<Array<Record<string, string>>>> {
  if (term.length < 3) return Err('query too short');
  log.debug(`search: ${term}`);

  try {
    const sqlTerm = `%${term}%`;

    const records = await db
      .selectFrom('facts')
      .select(['thing', 'fact'])
      .where((eb) =>
        eb.or([eb('thing', 'like', sqlTerm), eb('fact', 'like', sqlTerm)]),
      )
      .where('inactive', '=', sql`FALSE`)
      .orderBy(['thing', 'fact'])
      .limit(500)
      .execute();

    return records?.length > 0 ? Ok(records) : Err(`No facts for ${term}`);
  } catch (e: unknown) {
    log.error('Failed to lookup %s: %s', term, e);
    return Err(e instanceof Error || typeof e === 'string' ? e : String(e));
  }
}

async function selectRandomByThing(thing: string): Promise<Option<string>> {
  const options = await lookup(thing);
  if (options.ok && options.value.length > 0) {
    const facts = options.value;
    const idx = Math.floor(Math.random() * facts.length);
    const fact = facts[idx];
    if (fact) return Some(fact);
  }

  return None;
}

export const init: PluginInit = (pm) => {
  const makeReply =
    ({
      channel,
      say,
      timestamp,
    }: {
      channel: string;
      say: SayFn;
      timestamp: string;
    }) =>
    async (emoji: Emoji, message?: string) => {
      await pm.app.client.reactions.add({ channel, timestamp, name: emoji });
      if (message) await say(message);
    };

  pm.command(
    'forget',
    {
      section: 'splainer',
      command: '!forget THING := FACT',
      description: 'Forget a fact',
      examples: ['`!forget pluto := a planet`'],
    },
    async ({ channel, rest, timestamp }, { say }) => {
      if (!rest.some) return;

      const replyWith = makeReply({ channel, say, timestamp });

      const [thing, fact] = rest.value.split(':=', 2).map((s) => s.trim());
      if (!(thing && fact)) {
        await say('Usage: `!forget THING := FACT`');
        return;
      }

      const result = await forget(thing, fact);
      await replyWith(result.ok ? Emoji.OK : Emoji.FAIL);
    },
  );

  pm.command(
    'forget*',
    {
      section: 'splainer',
      command: '!forget* THING',
      description: 'Forget everything about a thing',
      examples: ['`!forget* the 2016 election`'],
    },
    async ({ channel, rest: thing, timestamp }, { say }) => {
      const replyWith = makeReply({ channel, say, timestamp });

      if (!thing) {
        await replyWith(Emoji.FAIL, 'Usage: `!forget* THING`');
        return;
      }

      if (!thing.some) return;

      const result = await forgetAll(thing.value);
      await replyWith(result.ok ? Emoji.OK : Emoji.FAIL);
    },
  );

  pm.command(
    'learn',
    {
      section: 'splainer',
      command: '!learn THING := FACT',
      description: 'Learn a fact',
      examples: ['`!learn Ontario := a province`'],
    },
    async ({ channel, rest: expr, text, timestamp }, { say }) => {
      if (!expr.some) return;

      const replyWith = makeReply({ channel, say, timestamp });

      const [thing, fact] = expr.value.split(':=', 2).map((s) => s.trim());
      if (!(thing && fact)) {
        await replyWith(Emoji.FAIL, 'Usage: `!learn THING := FACT`');
        return;
      }

      const result = await learn(thing, fact);
      if (!result.ok) log.error(`Failed to learn: ${text}`, result.error);

      await replyWith(result.ok ? Emoji.OK : Emoji.FAIL);
    },
  );

  pm.command(
    'lookup',
    {
      section: 'splainer',
      command: '!lookup THING',
      description: 'Look-up all facts about a thing',
      examples: ['`!lookup at the sky`'],
    },
    async ({ channel, rest: thing, timestamp }, { say }) => {
      const replyWith = makeReply({ channel, say, timestamp });

      if (!thing.some) {
        await replyWith(Emoji.FAIL, 'Usage: `!lookup THING`');
        return;
      }

      const results = await lookup(thing.value);
      if (results.ok) {
        await pm.app.client.files.upload({
          channels: channel,
          content: JSON.stringify(results.value, null, 2),
          filetype: 'javascript',
          title: thing.value,
        });
      } else {
        await replyWith(
          Emoji.WRONG,
          `I don't have anything for \`${thing.value}\``,
        );
      }
    },
  );

  pm.command(
    'search',
    {
      section: 'splainer',
      command: '!search TERM',
      description: 'Search all knowledge for a term/substring',
      examples: ['`!search high and low`'],
    },
    async ({ channel, payload, rest: thing, timestamp }, { say }) => {
      const replyWith = makeReply({ channel, say, timestamp });

      if (!thing.some) {
        await replyWith(Emoji.FAIL, 'Usage: `!search WORD`');
        return;
      }

      const searchTerm = thing.value.trim();
      const results = await search(searchTerm);

      if (results.ok) {
        const pairs = results.value.map((obj) => [obj.thing, obj.fact]);
        try {
          const { ts } = payload;
          await pm.app.client.files.upload({
            channels: channel,
            content: JSON.stringify({ searchTerm, results: pairs }, null, 2),
            filetype: 'javascript',
            ts,
            title: searchTerm,
          });
        } catch (e) {
          log.error('Failed to search for [%s]: %s', searchTerm, e);
        }
      } else {
        const { message } = results.error;
        await replyWith(
          Emoji.WRONG,
          `I don't have anything for \`${searchTerm}\`: \`${message}\``,
        );
      }
    },
  );

  pm.message(
    {
      section: 'splainer',
      description: 'fetch a random fact about `THING` (if known)',
      examples: ['`?THING`'],
    },
    async ({ payload, say }) => {
      if (payload.subtype || !payload.text) return;

      const m = payload.text.match(/^\?(.+?)\s*$/);
      if (!m || !m[1]) return;

      const thing = m[1];
      const fact = await selectRandomByThing(thing);
      await say(
        fact.some
          ? `${thing} == ${fact.value}`
          : `I can't find anything for \`${thing}\``,
      );
    },
  );

  pm.message(
    {
      section: 'splainer',
      description: "I'll randomly botsplain things for you",
    },
    async ({ payload, say }) => {
      if (payload.subtype || !payload.text) return;

      const { text } = payload;
      if (text.length < 5 || text.length > 42) return;
      if (text.startsWith('!') || text.startsWith('?')) return;

      const result = await search(text);
      if (result.ok) {
        const rows = result.value;

        if (rows.length > 0) {
          const { thing, fact } = selectFrom(rows);
          await say(
            selectFrom([`${thing} is ${fact}`, `I heard ${thing} was ${fact}`]),
          );
        }
      }
    },
  );

  pm.message(
    {
      section: 'splainer',
      description: "I'll spontaneously reply with facts",
      examples: [
        '`what is THING?`: return a fact about `THING`',
        '`who is PERSON?`: return a fact about `PERSON`',
      ],
    },
    async ({ payload, say }) => {
      if (payload.subtype || !payload.text) return;

      const m = payload.text.match(RE_passive_fetch);
      if (!(m && m[1] && m[2])) return;

      const verb = m[1];
      const thing = m[2];
      const fact = await selectRandomByThing(thing);
      if (fact.some) {
        await say(`${thing} ${verb} ${fact.value}`);
      }
    },
  );

  pm.message(
    {
      section: 'splainer',
      description: "I'll passively learn from the channel(s)",
      examples: ['`THING is/are FACT`: Learn a FACT about a THING'],
    },
    async ({ payload }) => {
      if (payload.subtype || !payload.text) return;

      const text = payload.text.trim();
      if (
        text.match(/(?:what|who)/i) ||
        text.includes('?') ||
        text.match(RE_passive_fetch)
      )
        return;

      const m = text.match(RE_passive_learn);
      if (!(m && m[1] && m[2])) return;

      const { channel, ts: timestamp } = payload;
      const thing = m[1];
      const fact = m[2];
      log.debug(`learning: [${thing}[${fact}]`);

      if (thing.length <= 42) {
        const result = await learn(thing, fact);
        if (!result.ok) {
          await pm.app.client.reactions.add({
            channel,
            timestamp,
            name: Emoji.FAIL,
          });
        }
      }
    },
  );

  pm.command(
    'dump!',
    {
      section: 'splainer',
      command: '!dump!',
      description: 'Dump entire fact store (max 500 records)',
    },
    async ({ channel }, { say }) => {
      const results = await dump();
      if (results.ok) {
        const initialValue: FactDump = { active: [], inactive: [] };
        const data: FactDump = results.value.reduce(
          (data, { thing, fact, inactive }) => {
            (inactive ? data.inactive : data.active).push({ [thing]: fact });
            return data;
          },
          initialValue,
        );
        await pm.app.client.files.upload({
          channels: channel,
          content: JSON.stringify(data, null, 2),
          filetype: 'javascript',
          title: 'facts',
        });
      } else {
        await say(`I didn't find anything! ${results.error.message}`);
      }
    },
  );
};

export default init;
