import childproc from 'child_process';
import { env as ENV } from 'process';
import { promisify } from 'util';

import { log } from '../log';
import { expandPath } from '../util';
import { PluginInit } from './index';

const execFile = promisify(childproc.execFile);

const HELP = {
  calc: `Usage: \`!calc EXPR\`
  - \`EXPR\` - RPN-style expression to evaluate
  The expression is evaluated one token at a time.
  The values of all registers are displayed after evaluating each token.
  Example: \`!calc 72 32 - 5 9 / *\` => \`... 22.22\``,
};

export const Calc: PluginInit = (pm) => {
  pm.command("calc", async ({ rest }, { say }) => {
    const calcBin = ENV['HOB_CALC'];
    if (!calcBin) {
      await say("I don't know where my calculator is");
      return;
    }

    if (rest.some) {
      const calc = expandPath(calcBin);
      const { stderr, stdout } = await execFile(calc, [rest.value]);
      log.warn("%s stderr: %s", calcBin, stderr);
      await say('```' + stdout + '```');
    } else {
      await say(HELP.calc);
    }
  });
};

export default Calc;
