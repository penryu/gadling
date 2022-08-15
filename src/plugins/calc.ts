import childproc from "child_process";
import { env as ENV } from "process";
import { promisify } from "util";

import { log } from "../log";
import { PluginInit } from "./index";

const execFile = promisify(childproc.execFile);

const HELP = {
  calc: `\`!calc EXPR\`
  - \`EXPR\` - RPN-style expression to evaluate
  The expression is evaluated one token at a time.
  The values of all registers are displayed after evaluating each token.
  Calculator backend may be customized using the \`$HOB_CALC\` env variable.
  Example: \`!calc 72 32 - 5 9 / *\` => \`... 22.22\``,
};

export const Calc: PluginInit = (pm) => {
  pm.command("calc", [HELP.calc], async ({ rest }, { say }) => {
    const calcBin = ENV["HOB_CALC"] || "hpnc";

    if (rest.some) {
      try {
        const { stderr, stdout } = await execFile(calcBin, [rest.value]);
        log.warn("%s stderr: %s", calcBin, stderr);
        await say("```" + stdout + "```");
      } catch (e) {
        log.error("%s: %s", __filename, e);
        await say(`My calculator (\`${calcBin}\`) is borken!`);
      }
    } else {
      await say(HELP.calc);
    }
  });
};

export default Calc;
