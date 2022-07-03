import { App } from '@slack/bolt';

import log from '../log';
import {
  CommandListener,
  MentionListener,
  MessageListener,
  SlashCommandListener,
} from "../types";
import { parseBangCommand, sleep } from '../util';
import Eightball from './eightball';
import Emu from './emu';
import Ryecock from './ryecock';
import Splain from './splain';
export type PluginInit = (pm: PluginManager) => void;

export class PluginManager {
  readonly app: App;
  readonly commands: Record<string, CommandListener>;

  constructor(app: App) {
    this.app = app;
    this.commands = {};
  }

  use(f: PluginInit): typeof this {
    f(this);
    return this;
  }

  command(cmd: string, listener: CommandListener) {
    this.commands[cmd] = listener;
  }

  mention(listener: MentionListener) {
    this.app.event('app_mention', listener);
  }

  message(listener: MessageListener) {
    this.app.message(listener);
  }

  slashCommand(cmd: string, listener: SlashCommandListener) {
    this.app.command(cmd, listener);
  }
}

const BangCommandListener: PluginInit = (pm) => {
  pm.message(async (args) => {
    if (args.payload.subtype || !args.payload.text) return;

    const opt_bang = parseBangCommand(args.payload.text);
    if (opt_bang.some) {
      const bangCmd = opt_bang.value;
      const handler = pm.commands[bangCmd.command];
      if (handler) {
        await handler(bangCmd, args);
      } else {
        log.info(`Ignoring unrecognized command: ${bangCmd.text}`);
      }
    }
  });
};

const Debug: PluginInit = (pm) => {
  // eslint-disable-next-line @typescript-eslint/require-await
  pm.mention(async ({ payload }) => log.debug(payload));
  // eslint-disable-next-line @typescript-eslint/require-await
  pm.message(async ({ payload }) => log.debug(payload));
};

const Help: PluginInit = (pm) => {
  pm.mention(async ({ payload, say }) => {
    if (!payload.text.includes("help")) return;

    await say(
      [
        "*Commands*:",
        " - `/be`",
        " - `/chilify`",
        " - `/flood`",
        "*Triggers*:",
        " - `chili`",
        " - `help`",
        " - `today`",
        "Examples:",
        " - `/be ryecock`",
        " - `/chilify @hob`",
        " - `@hob give me chili`",
      ].join("\n")
    );
  });
};

export const initializePlugins = (app: App) => {
  const pm = new PluginManager(app)
    .use(Debug)
    .use(Eightball)
    .use(Emu)
    .use(Help)
    .use(Ryecock)
    .use(Splain)
    .use(BangCommandListener);

  pm.message(async ({ payload, say }) => {
    if (payload.subtype !== undefined) return;

    if (payload.text?.match(/^\s*today(?:\.|\?)+\s*$/i)) {
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
      const today = dow[new Date().getDay()] ?? 'just another day';
      await say(today);
    }
  });
};
