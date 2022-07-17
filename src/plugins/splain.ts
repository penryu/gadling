import { EMOJI_FAIL, EMOJI_OK } from '../constants';
import { Db } from '../db';
import log from '../log';
import { Err, None, Ok, Option, Result, Some } from '../types';
import { PluginInit } from './index';

interface FactsRow {
  thing: string;
  fact: string;
}

const IGNORED_SEARCH_TERMS = ['and', 'the', 'you'];

const RE_passive_fetch = /^\s*(?:what|who) (is|are) (.+?)\??\s*$/i;
const RE_passive_learn = /^\s*(.+?)\s+(?:is|are)\s+(.+)\s*$/i;

export async function forget(
  thing: string,
  fact: string
): Promise<Result<number>> {
  log.debug(`forget: ${thing} := ${fact}`);

  try {
    const db = await Db();
    const { changes } = await db.run(
      `UPDATE facts SET inactive = TRUE WHERE thing = ? AND fact = ?`,
      thing,
      fact
    );
    return Ok(changes ?? 0);
  } catch (e: unknown) {
    log.error("Failed to delete [%s == %s]: %s", thing, fact, e);
    return Err(e instanceof Error || typeof e === "string" ? e : String(e));
  }
}

export async function forgetAll(thing: string): Promise<Result<number>> {
  log.debug(`forgetAll: ${thing}`);

  try {
    const db = await Db();
    const { changes } = await db.run(
      `UPDATE facts SET inactive = TRUE WHERE thing = ?`,
      thing
    );
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
    const result = await db.run(
      `
      INSERT INTO facts (thing, fact)
      VALUES (?, ?)
      ON CONFLICT (thing, fact)
      DO UPDATE SET inactive = FALSE
        `,
      thing,
      fact
    );

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
    const rows = await db.all<Array<FactsRow>>(
      `SELECT fact FROM facts WHERE thing = ? AND inactive = FALSE`,
      thing
    );
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
  if (term.length < 3 || IGNORED_SEARCH_TERMS.includes(term))
    return Err("query too short");

  log.debug(`search: ${term}`);

  const sqlTerm = `%${term}%`;
  try {
    const db = await Db();
    const rows = await db.all<Array<FactsRow>>(
      `
      SELECT thing, fact
      FROM facts
      WHERE (thing LIKE $sqlTerm OR fact LIKE $sqlTerm)
      `,
      { $sqlTerm: sqlTerm }
    );

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
  const row = await db.get<FactsRow>(
    `
  SELECT thing, fact
    FROM facts
    WHERE thing = ? AND inactive = FALSE
    ORDER BY RANDOM()
    LIMIT 1
    `,
    thing
  );
  return row ? Some(row.fact) : None;
}

export const init: PluginInit = (pm) => {
  pm.command("forget", async ({ channel, rest, timestamp }, { say }) => {
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
  });

  pm.command(
    "forget*",
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

  pm.command("lookup", async ({ rest: thing }, { say }) => {
    if (!thing.some) {
      await say("Usage: `!lookup THING`");
      return;
    }

    const results = await lookup(thing.value);
    if (results.ok) {
      const facts = results.value.map((fact: string) => `- \`${fact}\`\n`);
      await say(`${thing.value}\n${facts.join("\n")}`);
    } else {
      await say(`I don't have anything for \`${thing.value}\``);
    }
  });

  pm.command("search", async ({ rest: thing }, { say }) => {
    if (!thing.some) {
      await say("Usage: `!search WORD`");
      return;
    }

    const term = thing.value.trim();
    const results = await search(term);
    if (results.ok) {
      try {
      const rows = results.value.map(row => JSON.stringify(row));
      await say("```" + rows.join('\n') + "```");
      } catch (e) {
        log.error('failed to search for [%s]: %s', term, e);
      }
    } else {
      await say(
        `I don't have anything for \`${thing.value}\`: \`${results.error.message}\``
      );
    }
  });

  // `?$thing`: convenience alias for `!lookup`
  pm.message(async ({ payload, say }) => {
    if (payload.subtype || !payload.text) return;

    const m = payload.text.match(/^\?(.+?)\s*$/);
    if (!m || !m[1]) return;

    const thing = m[1];
    const fact = await selectRandomByThing(thing);
    await say(fact.some
      ? `${thing} == ${fact.value}`
      : `I can't find anything for \`${thing}\``);
  });

  // respond to `what/who is/are $thing`
  pm.message(async ({ payload, say }) => {
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
  pm.message(async ({ payload }) => {
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
    log.info(`learning: [${thing}[${fact}]`);

    const result = await learn(thing, fact);
    if (result.ok) {
      await pm.app.client.reactions.add({
        channel,
        timestamp,
        name: result.ok ? EMOJI_OK : EMOJI_FAIL,
      });
    }
  });

};

export default init;
