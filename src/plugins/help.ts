import { PluginInit } from './index';

export const init: PluginInit = (reg) => {
  reg.mention(async ({ payload, say }) => {
    if (!payload.text.includes("help")) return;

    await say(
      [
        "*Commands*:",
        " - `/be`",
        " - `/chilify`",
        "*Triggers*:",
        " - `chili`",
        " - `help`",
        "_Note that triggers currently require addressing me directly._",
        "Examples:",
        " - `/be ryecock`",
        " - `/chilify @hob`",
        " - `@hob give me chili`",
      ].join("\n")
    );
  });
};

export default init;
