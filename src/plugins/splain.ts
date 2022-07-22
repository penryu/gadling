import { ISqlite } from 'sqlite';

import { EMOJI_FAIL, EMOJI_OK } from '../constants';
import { Db } from '../db';
import log from '../log';
import { Err, None, Ok, Option, Result, Some } from '../types';

import { PluginInit } from './index';

interface FactsRow {
  thing: string;
  fact: string;
}

const RE_passive_fetch = /^\s*(?:what|who) (is|are) (.+?)\??\s*$/i;
const RE_passive_learn = /^\s*(.+?)\s+(?:is|are)\s+(.+)\s*$/i;

type QueryTypes =
  | "dump"
  | "forget"
  | "forgetAll"
  | "learn"
  | "lookup"
  | "search"
  | "selectRandom";

const QUERIES: Record<QueryTypes, ISqlite.SqlType> = {
  dump: `
    SELECT *
    FROM facts
    ORDER BY inactive, thing, fact
    LIMIT 500
  `,
  forget: `
    UPDATE facts
    SET inactive = TRUE
    WHERE thing = ? AND fact = ?
  `,
  forgetAll: `
    UPDATE facts
    SET inactive = TRUE
    WHERE thing = ?
  `,
  learn: `
    INSERT INTO facts (thing, fact)
    VALUES (?, ?)
    ON CONFLICT (thing, fact) DO
      UPDATE SET inactive = FALSE`
  ,
  lookup: `
    SELECT fact
    FROM facts
    WHERE thing = ? AND inactive = FALSE
    ORDER BY fact
    LIMIT 100
  `,
  search: `
    SELECT thing, fact
    FROM facts
    WHERE (thing LIKE $sqlTerm OR fact LIKE $sqlTerm) AND inactive = FALSE
    ORDER BY thing, fact
    LIMIT 100
  `,
  selectRandom: `
    SELECT thing, fact
    FROM facts
    WHERE thing = ? AND inactive = FALSE
    ORDER BY RANDOM()
    LIMIT 1
  `,
};

export async function dump(): Promise<Result<Array<FactsRow>>> {
  log.debug(`dump`);

  try {
    const db = await Db();
    const rows = await db.all<Array<FactsRow>>(QUERIES.dump);
    return rows.length > 0 ? Ok(rows) : Err(`No records found`);
  } catch (e: unknown) {
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

export async function forget(
  thing: string,
  fact: string
): Promise<Result<number>> {
  log.debug(`forget: ${thing} := ${fact}`);

  try {
    const db = await Db();
    const { changes } = await db.run(QUERIES.forget, thing, fact);
    return (changes && changes > 0) ? Ok(changes) : Err('no changes');
  } catch (e: unknown) {
    log.error("Failed to delete [%s == %s]: %s", thing, fact, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

export async function forgetAll(thing: string): Promise<Result<number>> {
  log.debug(`forgetAll: ${thing}`);

  try {
    const db = await Db();
    const { changes } = await db.run(QUERIES.forgetAll, thing);
    return Ok(changes ?? 0);
  }
  catch (e: unknown) {
    log.error("Failed to delete facts for %s: %s", thing, e);
    return Err((e instanceof Error || typeof e === 'string') ? e : String(e));
  }
}

async function learn(thing: string, fact: string): Promise<Result<number>> {
  log.debug(`learn: ${thing} := ${fact}`);

  try {
    const db = await Db();
    const result = await db.run(QUERIES.learn, thing, fact);
    log.debug({ thing, fact, result });
    return Ok(result.changes ?? 0);
  }
  catch (e: unknown) {
    log.error("Failed to insert %s == %s: %s", thing, fact, e);
    return Err((e instanceof Error || typeof e === 'string') ? e : String(e));
  }
}

async function lookup(thing: string): Promise<Result<Array<string>>> {
  log.debug(`lookup: ${thing}`);

  try {
    const db = await Db();
    const rows = await db.all<Array<FactsRow>>(QUERIES.lookup, thing);
    return rows?.length > 0
      ? Ok(rows.map((r) => r.fact))
      : Err(`No facts for ${thing}`);
  }
  catch (e: unknown) {
    log.error("Failed to lookup %s: %s", thing, e);
    return Err((e instanceof Error || typeof e === 'string') ? e : String(e));
  }
}

async function search(term: string): Promise<Result<Array<FactsRow>>> {
  if (term.length < 3)
    return Err("query too short");

  log.debug(`search: ${term}`);

  const sqlTerm = `%${term}%`;
  try {
    const db = await Db();
    const rows = await db.all<Array<FactsRow>>(QUERIES.search, {
      $sqlTerm: sqlTerm,
    });
    return rows?.length > 0
      ? Ok(rows)
      : Err(`No facts for ${term}`);
  }
  catch (e: unknown) {
    log.error("Failed to lookup %s: %s", term, e);
    return Err((e instanceof Error || typeof e === 'string') ? e : String(e));
  }
}

async function selectRandomByThing(thing: string): Promise<Option<string>> {
  const db = await Db();
  const row = await db.get<FactsRow>(QUERIES.selectRandom, thing);
  return row ? Some(row.fact) : None;
}

export const init: PluginInit = (pm) => {
  pm.command(
    "forget",
    ["FIXME"],
    async ({ channel, rest, timestamp }, { say }) => {
      if (!rest.some) return;

      const [thing, fact] = rest.value.split(":=", 2).map((s) => s.trim());
      if (!(thing && fact)) {
        await say("Usage: `!forget THING := FACT`");
        return;
      }

      const result = await forget(thing, fact);
      await pm.app.client.reactions.add({
        channel,
        timestamp,
        name: result.ok ? EMOJI_OK : EMOJI_FAIL,
      });
    }
  );

  pm.command(
    "forget*",
    ["FIXME"],
    async ({ channel, rest: thing, timestamp }, { say }) => {
      if (!thing) {
        await say("Usage: `!forget* THING`");
        return;
      }

      if (!thing.some) return;

      const result = await forgetAll(thing.value);
      await pm.app.client.reactions.add({
        channel,
        timestamp,
        name: result.ok ? EMOJI_OK : EMOJI_FAIL,
      });
    }
  );

  pm.command(
    "learn",
    ["FIXME"],
    async ({ channel, rest: expr, text, timestamp }, { say }) => {
      if (!expr.some) return;

      const [thing, fact] = expr.value.split(":=", 2).map((s) => s.trim());
      if (!(thing && fact)) {
        await say("Usage: `!learn THING := FACT`");
        return;
      }

      const result = await learn(thing, fact);
      if (!result.ok) log.error(`Failed to learn: ${text}`, result.error);

      await pm.app.client.reactions.add({
        channel,
        timestamp,
        name: result.ok ? EMOJI_OK : EMOJI_FAIL,
      });
    }
  );

  pm.command("lookup", ["FIXME"], async ({ channel, rest: thing }, { say }) => {
    if (!thing.some) {
      await say("Usage: `!lookup THING`");
      return;
    }

    const results = await lookup(thing.value);
    if (results.ok) {
      await pm.app.client.files.upload({
        channels: channel,
        content: JSON.stringify(results.value, null, 2),
        filetype: "javascript",
        title: thing.value,
      });
    } else {
      await say(`I don't have anything for \`${thing.value}\``);
    }
  });

  pm.command(
    "search",
    ["FIXME"],
    async ({ channel, payload, rest: thing }, { say }) => {
      if (!thing.some) {
        await say("Usage: `!search WORD`");
        return;
      }

      const searchTerm = thing.value.trim();
      const results = await search(searchTerm);
      if (results.ok) {
        try {
          const { thread_ts, ts } = payload;
          await pm.app.client.files.upload({
            channels: channel,
            content: JSON.stringify(
              { searchTerm, results: results.value },
              null,
              2
            ),
            filetype: "javascript",
            thread_ts: thread_ts ?? ts,
            title: searchTerm,
          });
        } catch (e) {
          log.error("failed to search for [%s]: %s", searchTerm, e);
        }
      } else {
        await say(
          `I don't have anything for \`${thing.value}\`: \`${results.error.message}\``
        );
      }
    }
  );

  // `?$thing`: convenience alias for `!lookup`
  pm.message(["FIXME"], async ({ payload, say }) => {
    if (payload.subtype || !payload.text) return;

    const m = payload.text.match(/^\?(.+?)\s*$/);
    if (!m || !m[1]) return;

    const thing = m[1];
    const fact = await selectRandomByThing(thing);
    await say(
      fact.some
        ? `${thing} == ${fact.value}`
        : `I can't find anything for \`${thing}\``
    );
  });

  // respond to `what/who is/are $thing`
  pm.message(["FIXME"], async ({ payload, say }) => {
    if (payload.subtype || !payload.text) return;

    const m = payload.text.match(RE_passive_fetch);
    if (!(m && m[1] && m[2])) return;

    const verb = m[1];
    const thing = m[2];
    const fact = await selectRandomByThing(thing);
    if (fact.some) {
      await say(`${thing} ${verb} ${fact.value}`);
    }
  });

  // learn `$thing is $fact`
  pm.message(["FIXME"], async ({ payload }) => {
    if (payload.subtype || !payload.text) return;

    const text = payload.text.trim();
    if (
      text.match(/(?:what|who)/i) ||
      text.includes("?") ||
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
      if (result.ok) {
        await pm.app.client.reactions.add({
          channel,
          timestamp,
          name: result.ok ? EMOJI_OK : EMOJI_FAIL,
        });
      }
    }
  });

  pm.command("dump!", ["FIXME"], async (_, { say }) => {
    const results = await dump();
    if (results.ok) {
      await say("```" + JSON.stringify(results.value, null, "  ") + "```");
    } else {
      await say(`I didn't find anything! ${results.error.message}`);
    }
  });
};

export default init;
