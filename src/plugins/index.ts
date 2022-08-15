import { App } from "@slack/bolt";
import os from "os";

import log from "../log";
import { packageJson } from "../metadata";
import { CommandListener, MessageListener } from "../types";
import { parseBangCommand } from "../util";

import Calc from "./calc";
import Dice from "./dice";
import Karma from "./karma";
import Eightball from "./eightball";
import Pleasantries from "./pleasantries";
import Ryecock from "./ryecock";
import Splain from "./splain";

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
    .use(Pleasantries)
    .use(Ryecock)
    .use(Splain);

  pm.command(
    "ping",
    ["displays some info about the bot"],
    async (_, { say }) => {
      const { user: my_name } = await pm.app.client.auth.test();
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model ?? "unknown CPU model";
      const cpuCount = cpus.length;
      const cpuArch = os.arch();
      const hostname = os.hostname();
      const platform = os.platform();
      const release = os.release();
      const opsys = `${platform} ${release}`;
      const { homepage, version } = packageJson;

      const response = [
        `${
          my_name ?? "anonymous"
        } (gadling ${version}; ${homepage}) comin' at ya from \`${hostname}\`,`,
        `an \`${cpuArch}\` machine`,
        `with *${cpuCount}x* \`${cpuModel}\` cores`,
        `running \`${opsys}\``,
      ];

      await say(response.join(" "));
    }
  );
};
