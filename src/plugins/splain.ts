import { Db } from '../db';
import log from '../log';
import { Err, None, Ok, Option, Result, Some } from '../types';
import { PluginInit } from './index';

interface FactsRow {
  thing: string;
  fact: string;
}

// FIXME
// export async function forget(thing: string): Promise<Option<number>> {
//   log.debug(`forget '${thing}'`);
//   const db = await Db();
//   const result = await db.run("DELETE FROM facts WHERE thing = ?", thing);
//   return result ? Some(result.changes ?? 0) : None;
// }

async function learn(thing: string, fact: string): Promise<Result<number>> {
  try {
    const db = await Db();
    const result = await db.run(
      "INSERT INTO facts (thing, fact) VALUES (?, ?)",
      thing,
      fact
    );

    log.debug({ thing, fact, result });
    return Ok(result.changes ?? 0);
  } catch (e: unknown) {
    log.error(e);
    return Err(e instanceof Error ? e : String(e));
  }
}

async function lookup(thing: string): Promise<Option<Array<string>>> {
  const db = await Db();
  const rows = await db.all<Array<FactsRow>>(
    "SELECT fact FROM facts WHERE thing = ?",
    thing
  );

  return rows ? Some(rows.map(r => r.fact)) : None;
}

async function selectRandomByThing(
  thing: string
): Promise<Option<string>> {
  const db = await Db();
  const row = await db.get<FactsRow>(
    "SELECT thing, fact FROM facts WHERE thing = ? ORDER BY RANDOM() LIMIT 1",
    thing
  );
  return row ? Some(row.fact) : None;
}

export const init: PluginInit = (pm) => {
  // pm.command("forget", async ({ rest: thing }, { say }) => {
  //   if (!thing.some) return;

  //   const results = await forget(thing.value);
  //   // FIXME
  // });

  pm.command('learn', async ({ rest: expr, text }, { payload, say }) => {
    if (!expr.some) return;

    const { channel, ts: timestamp } = payload;
    const [thing, fact] = expr.value.split(':=', 2).map(s => s.trim());
    if (!(thing && fact)) {
      await say('Usage: `!learn THING := FACT`');
      return;
    }

    const result = await learn(thing, fact);
    if (!result.ok) log.error(`Failed to learn: ${text}`, result.error);

    await pm.app.client.reactions.add({
      channel,
      timestamp,
      name: result.ok ? 'white_check_mark' : 'poop',
    });
  });

  pm.command('lookup', async ({ rest: thing }, { say }) => {
    if (!thing.some) return;

    const results = await lookup(thing.value);
    if (results.some) {
      const facts = results.value.map((fact: string) => `- \`${fact}\`\n`);
      await say(`${thing.value}\n${facts.join('\n')}`);
    } else {
      await say(`I don't have anything for \`${thing.value}\``);
    }
  });

  // convenience alias for `!lookup`
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

};

export default init;
