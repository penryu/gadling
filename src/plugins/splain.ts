import { PluginInit } from './index';
import { Db } from '../db';

interface FactsRow {
  thing: string;
  fact: string;
}

export class Gilderoy {
  async selectAllByThing(thing: string): Promise<Array<string>> {
    const db = await Db();
    const rows = await db.all<Array<FactsRow>>(
      "SELECT FROM facts WHERE thing = ?",
      thing
    );
    if (!rows) throw new Error(`Key ${thing} not found`);
    return rows.map((row) => row.fact);
  }

  async selectRandomByThing(thing: string): Promise<string> {
    const db = await Db();
    const row = await db.get<FactsRow>(
      "SELECT thing, fact FROM facts WHERE thing = ? ORDER BY RANDOM() LIMIT 1",
      thing
    );
    if (!row) throw new Error(`Key ${thing} not found`);
    return row.fact;
  }

  async selectRandom(): Promise<FactsRow> {
    const db = await Db();
    const row = await db.get<FactsRow>(
      "SELECT thing, fact FROM facts ORDER BY RANDOM() LIMIT 1"
    );
    if (!row) throw new Error("No facts available!");
    return row;
  }

  async showOff(): Promise<string> {
    console.log("showOff");

    let result = "Please teach me something!";

    try {
      const row = await this.selectRandom();
      if (row) {
        result = `*${row.thing}* is ${row.fact}`;
      }
    } catch (e) { /* Okay, let the default fly */ }

    return result;
  }

  async recall(thing: string): Promise<string> {
    console.log(`recall '${thing}'`);

    let result = `I don't know about ${thing}`;

    try {
      const fact = await this.selectRandomByThing(thing);
      if (fact) {
        result = `*${thing}* is ${fact}`;
      }
    } catch (e) { /* Okay, let the default fly */ }

    return result;
  }

  async forget(thing: string) {
    console.log(`forget '${thing}'`);
    const db = await Db();
    const result = await db.run("DELETE FROM facts WHERE thing = ?", thing);
    if (result) {
      console.log(`forgot ${result?.changes ?? "some"} facts about ${thing}`);
    } else {
      console.log(`I don't know about ${thing}`);
    }
  }

  async learn(thing: string, fact: string) {
    console.log(`learn '${thing}', '${fact}'`);

    try {
      const db = await Db();
      const current = await db.run(
        "INSERT INTO facts (thing, fact) VALUES (?, ?)",
        thing,
        fact
      );
      console.log({ thing, fact, current });
    } catch (e) {
      console.error(e);
      return `I failed to succeed to forget ${thing} :(`;
    }

    return "TBD";
  }
}

export const init: PluginInit = (reg) => {
  const splainer = new Gilderoy();

  reg.command('/showoff', async ({ ack, payload, say }) => {
    const ps: Array<Promise<unknown>> = [ack()];
    const m = payload.text.match(/^\s*(.*)\s*$/);
    let nugget: string;

    if (m && m[1]) {
      nugget = await splainer.recall(m[1]);
    } else {
      nugget = await splainer.showOff();
    }

    ps.push(say(nugget));

    await Promise.all(ps);
  });

  // reg.message(async ({ payload }) => {
  //   if (payload.subtype || !payload.text) return;

  //   // const { text } = payload;

  // });
};

export default init;
