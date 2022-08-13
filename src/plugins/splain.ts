import * as db from 'zapatos/db';
import type * as s from 'zapatos/schema';

import { EMOJI_FAIL, EMOJI_OK } from '../constants';
import { getPool } from '../db';
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
    const rows = await db.sql<s.facts.SQL, s.facts.Selectable[]>`
      SELECT ${"thing"}, ${"fact"}, ${"inactive"} FROM ${"facts"}
      ORDER BY ${"thing"}, ${"fact"}, ${"inactive"} LIMIT 500
    `.run(getPool());
    return Ok(rows);
  } catch (e: unknown) {
    log.error("Failed to collect factdump: %s", e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

export async function forget(
  thing: string,
  fact: string
): Promise<Result<number>> {
  log.debug(`forget: ${thing} := ${fact}`);

  try {
    const changes = await db.sql`
      UPDATE facts SET inactive = TRUE WHERE ${{ thing }} AND ${{ fact }}
    `.run(getPool());
    return Ok(changes.length);
  } catch (e: unknown) {
    log.error("Failed to delete [%s == %s]: %s", thing, fact, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

export async function forgetAll(thing: string): Promise<Result<number>> {
  log.debug(`forgetAll: ${thing}`);

  try {
    const changes = await db.sql`
      UPDATE facts SET ${"inactive"} = TRUE WHERE ${{ thing }}
    `.run(getPool());
    return Ok(changes.length);
  } catch (e: unknown) {
    log.error("Failed to delete facts for %s: %s", thing, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

async function learn(thing: string, fact: string): Promise<Result<number>> {
  log.debug(`learn: ${thing} := ${fact}`);

  try {
    const record = { thing, fact };
    await db.sql`
      INSERT INTO ${"facts"} (${db.cols(record)})
        VALUES (${db.vals(record)})
      ON CONFLICT (${db.cols(record)}) DO
        UPDATE SET ${"inactive"} = FALSE
    `.run(getPool());
    return Ok(0);
  } catch (e: unknown) {
    log.error("Failed to insert %s == %s: %s", thing, fact, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

async function lookup(thing: string): Promise<Result<Array<string>>> {
  log.debug(`lookup: ${thing}`);

  try {
    const records = await db.sql<s.facts.SQL, s.facts.Selectable[]>`
      SELECT ${"fact"} FROM ${"facts"}
      WHERE ${{ thing, inactive: false }}
      ORDER BY ${"fact"} LIMIT 100
    `.run(getPool());
    return records.length > 0
      ? Ok(records.map((r) => r.fact))
      : Err("no matching facts");
  } catch (e: unknown) {
    log.error("Failed to lookup %s: %s", thing, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

async function search(term: string): Promise<Result<Array<Record<string, string>>>> {
  if (term.length < 3) return Err("query too short");
  log.debug(`search: ${term}`);

  try {
    const sqlTerm = `%${term}%`;
    const records = await db.sql<
      s.facts.SQL,
      s.facts.Selectable[]>`
        SELECT ${"thing"}, ${"fact"} FROM ${"facts"}
        WHERE (
          ${"thing"} ILIKE ${db.param(sqlTerm)} OR
          ${"fact"} ILIKE ${db.param(sqlTerm)}
        ) AND ${"inactive"} = FALSE
        ORDER BY ${"thing"}, ${"fact"}
        LIMIT 100
    `.run(getPool());
    return records?.length > 0
      ? Ok(records.map(({ thing, fact }) => ({ [thing]: fact })))
      : Err(`No facts for ${term}`);
  } catch (e: unknown) {
    log.error("Failed to lookup %s: %s", term, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
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
  pm.command(
    "forget",
    ["Forget a fact", "`!forget pluto := a planet`"],
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
    ["Forget everything about a thing", "`!forget* the 2016 election`"],
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
    ["Learn a fact", "`!learn Ontario := a province`"],
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

  pm.command(
    "lookup",
    ["Look-up all facts about a thing", "`!lookup at the sky`"],
    async ({ channel, rest: thing }, { say }) => {
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
    }
  );

  pm.command(
    "search",
    ["Search all knowledge for a term/substring", "`!search high and low`"],
    async ({ channel, payload, rest: thing }, { say }) => {
      if (!thing.some) {
        await say("Usage: `!search WORD`");
        return;
      }

      const searchTerm = thing.value.trim();
      const results = await search(searchTerm);
      if (results.ok) {
        try {
          const { ts } = payload;
          await pm.app.client.files.upload({
            channels: channel,
            content: JSON.stringify(
              { searchTerm, results: results.value },
              null,
              2
            ),
            filetype: "javascript",
            ts,
            title: searchTerm,
          });
        } catch (e) {
          log.error("Failed to search for [%s]: %s", searchTerm, e);
        }
      } else {
        await say(
          `I don't have anything for \`${thing.value}\`: \`${results.error.message}\``
        );
      }
    }
  );

  pm.message(
    ["`?THING`: fetch a random fact about `THING` (if known)"],
    async ({ payload, say }) => {
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
    }
  );

  pm.message(
    ["I'll randomly botsplain things for you"],
    async ({ payload, say }) => {
      if (payload.subtype || !payload.text) return;

      const { text } = payload;
      if (text.length <= 5 || text.length > 42) return;

      const result = await db.sql<s.facts.SQL, s.facts.Selectable[]>`
        SELECT ${'thing'}, ${'fact'}
        FROM ${'facts'}
        WHERE ${'fact'} ILIKE ${db.param(`%${text}%`)}
          OR ${'thing'} ILIKE ${db.param(`%${text}%`)}
      `.run(getPool());

      if (result.length > 0) {
        const { thing, fact } = selectFrom(result);
        await say(`I heard ${thing} was ${fact}`);
      }
    }
  );

  pm.message(
    [
      "`what is THING?`: return a fact about `THING`",
      "`who is PERSON?`: return a fact about `PERSON`",
    ],
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
    }
  );

  pm.message(
    ["`THING is/are FACT`: Learn a FACT about a THING"],
    async ({ payload }) => {
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
        if (!result.ok) {
          await pm.app.client.reactions.add({
            channel,
            timestamp,
            name: EMOJI_FAIL,
          });
        }
      }
    }
  );

  pm.command(
    "dump!",
    ["Dump entire fact store (max 500 records)", "`!dump!`"],
    async ({ channel }, { say }) => {
      const results = await dump();
      if (results.ok) {
        const initialValue: FactDump = { active: [], inactive: [] };
        const data: FactDump = results.value.reduce(
          (data, { thing, fact, inactive }) => {
            (inactive ? data.inactive : data.active).push({ [thing]: fact });
            return data;
          },
          initialValue
        );
        await pm.app.client.files.upload({
          channels: channel,
          content: JSON.stringify(data, null, 2),
          filetype: "javascript",
          title: "facts",
        });
      } else {
        await say(`I didn't find anything! ${results.error.message}`);
      }
    }
  );
};

export default init;
