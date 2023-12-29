import { App } from '@slack/bolt';
import os from 'os';
import log from '../log';
import { packageJson } from '../metadata';
import { CommandListener, MessageListener } from '../types';
import { parseBangCommand } from '../util';
import Calc from './calc';
import Dice from './dice';
import Eightball from './eightball';
import Hangman from './hangman';
import Karma from './karma';
import Pleasantries from './pleasantries';
import Ryecock from './ryecock';
import Splain from './splain';

interface HelpEntry {
  command?: string;
  description: string;
  examples?: Array<string>;
  section: string;
}

type PassiveHelp = HelpEntry;

interface CommandHelp extends HelpEntry {
  command: string;
}

export type PluginInit = (pm: PluginManager) => void;

export class PluginManager {
  readonly app: App;
  readonly commands: Record<string, CommandListener>;
  readonly help: Array<HelpEntry> = [];

  constructor(app: App) {
    this.app = app;
    this.commands = {};

    this.command(
      'help',
      { section: 'core', command: '!help', description: 'displays this help' },
      async ({ rest: section }, { say }) => {
        const output = section.some
          ? this.renderHelp(section.value)
          : this.renderHelp();
        await say(output);
      },
    );

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

  command(command: string, help: CommandHelp, listener: CommandListener) {
    this.help.push(help);
    this.commands[command] = listener;
  }

  message(help: PassiveHelp, listener: MessageListener) {
    this.help.push(help);
    this.app.message(listener);
  }

  private renderHelp(section?: string): string {
    const output = [];
    if (section) {
      output.push(`*${section}*`);

      const sectionEntries = this.help.filter((e) => e.section === section);
      for (const { command, description, examples } of sectionEntries) {
        output.push(
          command ? `• \`${command}\` - ${description}` : `• ${description}`,
        );
        if (examples) output.push(...examples.map((ex) => `    • ${ex}`));
      }
    } else {
      const sections = Array.from(
        new Set(this.help.map((entry) => entry.section)),
      );
      sections.sort();
      output.push(
        `*Help Sections*`,
        ...sections.map((sec) => `    • *${sec}*`),
      );
      output.push('Use `!help SECTION` for help for that section');
    }

    return output.join('\n');
  }
}

export const initializePlugins = (app: App) => {
  const pm = new PluginManager(app)
    .use(Calc)
    .use(Dice)
    .use(Eightball)
    .use(Hangman)
    .use(Karma)
    .use(Pleasantries)
    .use(Ryecock)
    .use(Splain);

  pm.command(
    'ping',
    {
      command: '!ping',
      description: 'displays some info about the bot',
      section: 'core',
    },
    async (_, { say }) => {
      const { user: my_name } = await pm.app.client.auth.test();
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model.trimEnd() ?? 'unknown CPU model';
      const cpuCount = cpus.length;
      const cpuArch = os.arch();
      const hostname = os.hostname();
      const platform = os.platform();
      const release = os.release();
      const opsys = `${platform} ${release}`;
      const { homepage, version } = packageJson;

      const response = [
        `${
          my_name ?? 'anonymous'
        } (gadling ${version}; ${homepage}) comin' at ya from \`${hostname}\`,`,
        `an \`${cpuArch}\` machine`,
        `with *${cpuCount}x* \`${cpuModel}\` cores`,
        `running \`${opsys}\``,
      ];

      await say(response.join(' '));
    },
  );
};
