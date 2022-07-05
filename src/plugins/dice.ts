import { log } from '../log';
import { None, Option, Some } from '../types';
import { PluginInit } from './index';

type DiceRoll = { count: number, faces: number };

const REDiceRoll = /^(\d+)?d(\d+)\s*$/;

const help = (): string => `Example: \`!dice 2d6\` => \`2d6 => 3 | 5\``;

const parseDice = (str: string): Option<DiceRoll> => {
  const m = str.match(REDiceRoll);
  if (m) {
    const count = m[1] ? parseInt(m[1]) : 1;
    // The RegExp ensures that this index exists and is a string
    const faces = parseInt(m[2] as string);
    return Some({ count, faces });
  }

  return None;
}

const roll = (faces: number, count = 1): Array<number> => {
  return Array.from(
    { length: count },
    () => Math.floor(Math.random() * faces) + 1
  );
};

export const Dice: PluginInit = (pm) => {
  pm.command("dice", async ({ rest }, { say }) => {
    if (rest.some) {
      const dice = parseDice(rest.value);
      if (dice.some) {
        log.debug({ rest: rest.value, dice: dice.value });
        const { count, faces } = dice.value;
        const rolls = roll(faces, count);
        log.debug({ count, faces, rolls });
        const result = rolls.map((n) => `\`${n}\``).join(' | ');
        await say(`${rest.value} => ${result}`);
        return;
      }
    }

    await say(help());
  });
};

export default Dice;
