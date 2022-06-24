import { App } from '@slack/bolt';
import Emu from './emu';
import Help from './help';
import Ryecock from './ryecock';
import {
  CommandListener,
  MentionListener,
  MessageListener,
} from "../types";

export type PluginInit = (reg: Registry) => void;

export class Registry {
  readonly app: App;

  constructor(app: App) {
    this.app = app;
  }

  use(f: PluginInit) {
    f(this);
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

export const initializePlugins = (app: App) => {
  const reg = new Registry(app);
  reg.use(Help);
  reg.use(Emu);
  reg.use(Ryecock);
};
