import { App } from '@slack/bolt';
import os from 'os';

import log from '../log';
import { packageJson } from '../metadata';
import {
  CommandListener,
  MessageListener,
} from "../types";
import { normalizeUserId, parseBangCommand, selectFrom, sleep } from '../util';

import Calc from './calc';
import Dice from './dice';
import Karma from './karma';
import Eightball from './eightball';
import Ryecock from './ryecock';
import Splain from './splain';

export type PluginInit = (pm: PluginManager) => void;

export class PluginManager {
  readonly app: App;
  readonly commands: Record<string, CommandListener>;

  readonly commandHelp: Record<string, Array<string>> = {};
  readonly passiveHelp: Array<string> = [];

  constructor(app: App) {
    this.app = app;
    this.commands = {};

    this.command("help", ["displays this help"], async (_, { say }) => {
      await say(this.renderHelp());
    });

    this.app.message(async (args) => {
      const { payload } = args;
      if (payload.subtype || !payload.text) return;

      const opt_bang = parseBangCommand(payload);
      if (opt_bang.some) {
        const bangCmd = opt_bang.value;
        const handler = this.commands[bangCmd.command];
        if (handler) await handler(bangCmd, args);
        else log.info(`Ignoring unrecognized command: ${bangCmd.text}`);
      }
    });
  }

  use(f: PluginInit): typeof this {
    f(this);
    return this;
  }

  command(command: string, help: Array<string>, listener: CommandListener) {
    if (this.commandHelp[command])
      throw new Error(`cannot redefine command '${command}'`);

    this.commandHelp[command] = help;
    this.commands[command] = listener;
  }

  message(help: Array<string>, listener: MessageListener) {
    this.passiveHelp.push(...help);
    this.app.message(listener);
  }

  private renderHelp(): string {
    const help: Array<string> = [];

    for (const [cmd, items] of Object.entries(this.commandHelp))
      help.push(`*\`!${cmd}\`*`, ...items.map((x) => `- ${x}`));

    if (this.passiveHelp.length > 0)
      help.push(`*Other features*`, ...this.passiveHelp.map((x) => `- ${x}`));

    return help.join("\n");
  }
}

export const initializePlugins = (app: App) => {
  const pm = new PluginManager(app)
    .use(Calc)
    .use(Dice)
    .use(Eightball)
    .use(Karma)
    .use(Ryecock)
    .use(Splain)
  ;

  pm.command(
    "ping",
    ["displays some info about the bot"],
    async (_, { say }) => {
      const { user: my_name } = await pm.app.client.auth.test();
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model ?? 'unknown CPU model';
      const cpuCount = cpus.length;
      const cpuArch = os.arch();
      const hostname = os.hostname();
      const platform = os.platform();
      const release = os.release();
      const opsys = `${platform} ${release}`;
      const { homepage, version }= packageJson;

      const response = [
        `${my_name ?? 'anonymous'} (gadling ${version}; ${homepage}) comin' at ya from \`${hostname}\`,`,
        `an \`${cpuArch}\` machine`,
        `with *${cpuCount}x* \`${cpuModel}\` cores`,
        `running \`${opsys}\``,
      ];

      await say(response.join(' '));
    }
  );

  pm.message(
    ["I try to be polite"],
    async ({ payload, say }) => {
      if (payload.subtype !== undefined) return;

      const { text, user } = payload;
      if (!text) return;

      const user_tag = normalizeUserId(user);

      if (text.match(/\b(hello|hi)\b/i)) {
        const message = selectFrom(["greetings", "hello", "hey", "hi"]);
        await say(`${message} ${user_tag}`);
        return;
      }

      if (text.match(/\b(bye|so long|ttfn)\b/i)) {
        const message = selectFrom([
          "bye",
          "goodbye",
          "so long",
          "see ya",
          "sayonara",
        ]);
        await say(`${message} ${user_tag}!`);
        return;
      }

      if (text.match(/\b(thanks|ty|cheers)\b/i)) {
        await say(selectFrom([
          `don't mention it, ${user_tag}`,
          "no problem!",
          "you're welcome!",
        ]));
        return;
      }
    }
  );
  pm.message(
    ["`today` will display the current day of the week"],
    async ({ payload, say }) => {
      if (payload.subtype !== undefined) return;

      if (payload.text?.match(/^\s*today(?:\.|\?)*\s*$/i)) {
        const dow = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        await say("Today is...");
        await sleep(2000);
        const today = dow[new Date().getDay()] ?? "just another day";
        await say(today);
      }
    }
  );
};
