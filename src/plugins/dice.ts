import { log } from '../log';
import { None, Option, Some } from '../types';
import { PluginInit } from './index';

type DiceSpec = { count: number; faces: number; spec: string };

const MAX_COUNT = 100;
const MAX_FACES = 100;

const REDiceRoll = /^(\d{1,3})?d(\d{1,3})\s*$/;

const parseDice = (text: string): Option<DiceSpec> => {
  const m = text.match(REDiceRoll);
  if (m) {
    const count = m[1] ? parseInt(m[1]) : 1;
    // The RegExp ensures that this index exists and is a string
    const faces = parseInt(m[2] as string);
    if (count > 0 && count <= MAX_COUNT && faces >= 2 && faces <= MAX_FACES) {
      return Some({ count, faces, spec: text });
    }
  }

  return None;
};

function roll(text: string): Option<string> {
  const opt_dice = parseDice(text);

  if (opt_dice.some) {
    const dice = opt_dice.value;
    const outcome = Array.from(
      { length: dice.count },
      () => Math.floor(Math.random() * dice.faces) + 1,
    );
    const results = outcome.map((n) => `\`${n}\``).join(' | ');
    return Some(`${dice.spec} => ${results}`);
  }

  return None;
}

export const Dice: PluginInit = (pm) => {
  pm.command(
    'rand',
    {
      section: 'dice',
      command: '!rand',
      description: 'Returns a random number',
      examples: [
        `\`!rand\` - returns a random real number [0, 1)`,
        `\`!rand 10\` - returns a random integer [0, 10)`,
      ],
    },
    async ({ rest }, { say }) => {
      if (rest.some) {
        if (rest.value.match(/^\d+$/)) {
          const max = parseInt(rest.value);
          const n = Math.floor(Math.random() * max);
          await say(`\`[0, ${max})\` => \`${n}\``);
          return;
        }
      } else {
        await say(Math.random().toString());
        return;
      }
    },
  );

  const HELP = {
    dice:
      '```' +
      `Usage: [COUNT]dFACES
  - COUNT - optional number of dice (1-${MAX_COUNT}; default: 1)
  - FACES - number of faces on each die (2-${MAX_FACES})
Example: \`!dice 2d6\` => \`2d6 => 3 | 5\`` +
      '```',
  };

  pm.command(
    'dice',
    {
      section: 'dice',
      command: '`!dice`',
      description: 'Rolls dice specified D&D-style',
      examples: [
        '`!dice d6` - returns random integer [1, 6]',
        '`!dice 2d8` - returns random integer [2, 16]',
      ],
    },
    async ({ rest }, { say }) => {
      log.info('Dice: command: !dice %s', rest);

      if (rest.some) {
        const output = roll(rest.value);
        if (output.some) {
          await say(output.value);
          return;
        }
      }

      await say(HELP.dice);
    },
  );

  pm.message(
    {
      section: 'dice',
      description:
        'Mention a D&D-style dice roll (e.g., `2d6`, `3d8`) to see the outcome',
      examples: ['`3d6` - returns random integer [3, 18]'],
    },
    async ({ payload, say }) => {
      if (payload.subtype || !payload.text) return;

      const output = roll(payload.text);
      if (output.some) {
        log.info('Dice: message: %o', payload);
        await say(output.value);
      }
    },
  );
};

export default Dice;
