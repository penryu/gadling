import { PluginInit } from './index';

export const init: PluginInit = (reg) => {
  reg.mention(async ({ payload, say }) => {
    if (!payload.text.includes("help")) return;

    await say(
      [
        "*Commands*:",
        " - `/be`",
        " - `/chilify`",
        " - `/flood`",
        " - `/nope`",
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

export default init;
