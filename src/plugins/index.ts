import { App } from '@slack/bolt';
import Emu from './emu';
import Help from './help';
import Ryecock from './ryecock';
import Splain from './splain';
import {
  CommandListener,
  MentionListener,
  MessageListener,
} from "../types";
import { sleep } from '../util';

export type PluginInit = (reg: Registry) => void;

export class Registry {
  readonly app: App;

  constructor(app: App) {
    this.app = app;
  }

  use(f: PluginInit): typeof this {
    f(this);
    return this;
  }

  command(cmd: string, listener: CommandListener) {
    this.app.command(cmd, listener);
  }

  mention(listener: MentionListener) {
    this.app.event('app_mention', listener);
  }

  message(listener: MessageListener) {
    this.app.message(listener);
  }
}

const Debug: PluginInit = (reg) => {
  // eslint-disable-next-line @typescript-eslint/require-await
  reg.mention(async ({ payload }) => console.log(payload));
  // eslint-disable-next-line @typescript-eslint/require-await
  reg.message(async ({ payload }) => console.log(payload));
};

export const initializePlugins = (app: App) => {
  const reg = new Registry(app)
    .use(Debug)
    .use(Emu)
    .use(Help)
    .use(Ryecock)
    .use(Splain);

  reg.command("/nope", async ({ ack }) => {
    await ack();
  });

  reg.message(async ({ payload, say }) => {
    if (payload.subtype !== undefined) return;

    if (payload.text?.match(/^\s*today\.*\s*$/i)) {
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
