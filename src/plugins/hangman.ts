import { SayFn } from '@slack/bolt';
import { env } from 'process';
import { Emoji } from '../constants';
import log from '../log';
import { Err, None, Ok, Option, Result, Some } from '../types';
import { normalizeUserId, selectFromFile } from '../util';
import { PluginInit } from './index';

const WORDS_FILE = env.WORDS_PATH || '/usr/share/dict/words';

enum HangmanOutcome {
  ALIVE = 'ALIVE',
  DEAD = 'DEAD',
  FORFEIT = 'FORFEIT',
  IN_PROGRESS = 'IN_PROGRESS',
}

class HangmanGame {
  private static readonly ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
  private static readonly DEAD_LIMBS = 6;
  private readonly _word: string;
  private _outcome: HangmanOutcome = HangmanOutcome.IN_PROGRESS;
  private _suggested: Set<string> = new Set();
  private _limbs = 0;

  constructor(word: string) {
    log.trace(`Starting new Hangman game with "${word}"`);

    if (!word.match(/^[a-z]+$/)) {
      throw new Error('Words with non-ASCII characters are not supported');
    }

    this._word = word.toLowerCase();
  }

  public get inProgress(): boolean {
    return this._outcome === HangmanOutcome.IN_PROGRESS;
  }

  public get limbs(): number {
    return this._limbs;
  }

  public get missed(): Array<string> {
    return this.suggested.filter((c) => !this._word.includes(c));
  }

  public get outcome() {
    return this._outcome;
  }

  public get redactedWord(): string {
    return this._word
      .split('')
      .map((c) => (this._suggested.has(c) ? c : '_'))
      .join('');
  }

  public get suggested() {
    const lettersSuggested = Array.from(this._suggested);
    lettersSuggested.sort();
    return lettersSuggested;
  }

  public get word(): Result<string> {
    if (this.inProgress) return Err('There is already a game in progress!');
    return Ok(this._word);
  }

  evaluate() {
    log.trace(`Evaluating game...`);

    const partial = this.redactedWord;

    if (this._limbs >= HangmanGame.DEAD_LIMBS) {
      this._outcome = HangmanOutcome.DEAD;
      return;
    }

    if (this._word === partial) {
      this._outcome = HangmanOutcome.ALIVE;
      return;
    }
  }

  forfeit() {
    if (this.inProgress) this._outcome = HangmanOutcome.FORFEIT;
  }

  guessWord(guess: string): Result<HangmanOutcome> {
    log.debug(`User guessed "${guess}"`);

    guess = guess.toLowerCase();

    if (!this.inProgress) return Err('The game is over!');

    if (guess === this._word) {
      this._outcome = HangmanOutcome.ALIVE;
    } else {
      ++this._limbs;
    }

    this.evaluate();
    return Ok(this._outcome);
  }

  suggestLetter(letter: string): Result<boolean> {
    log.debug(`User suggested letter "${letter}"`);

    letter = letter.toLowerCase();

    if (!this.inProgress) return Err('The game is over!');

    if (letter.length !== 1) return Err('One letter at a time!');

    if (!HangmanGame.ALPHABET.includes(letter))
      return Err(`Invalid letter \`${letter}\`!`);

    if (this._suggested.has(letter))
      return Err(`${letter} was already suggested!`);

    this._suggested.add(letter);

    if (!this._word.includes(letter)) {
      this._limbs++;
    }

    this.evaluate();
    return Ok(this.inProgress);
  }
}

let currentGame: Option<HangmanGame> = None;

const displayGame = async (say: SayFn) => {
  if (currentGame.some) {
    const { value: game } = currentGame;
    const { inProgress, missed, outcome, redactedWord, word } = game;

    const lettersMissed = missed.map((c) => `\`${c.toUpperCase()}\``).join(' ');

    const output = [
      ...renderGallows(game),
      `The word so far: \`${redactedWord}\``,
      `Letters missed: ${lettersMissed}`,
    ];

    if (!inProgress) {
      if (word.ok) output.push(`*Game over. The word was \`${word.value}\`*`);
      let result: string;
      switch (outcome) {
        case HangmanOutcome.ALIVE:
          result = 'You win!';
          break;
        case HangmanOutcome.DEAD:
          result = 'You lose!';
          break;
        case HangmanOutcome.FORFEIT:
          result = 'You forfeit!';
          break;
        default:
          throw new Error(`Unknown outcome: ${outcome}`);
      }
      output.push(`*${result}*`);
      currentGame = None;
    }

    await say(output.join('\n'));
  }
};

const renderGallows = (game: HangmanGame): Array<string> => {
  const { limbs } = game;

  const H = limbs >= 1 ? 'O' : ' ';
  const B = limbs >= 2 ? '|' : ' ';
  const LL = limbs >= 3 ? '/' : ' ';
  const RL = limbs >= 4 ? '\\' : ' ';
  const LA = limbs >= 5 ? '\\' : ' ';
  const RA = limbs >= 6 ? '/' : ' ';

  return [
    '```',
    '\u2554\u2550\u2550\u2550\u2550\u2555',
    '\u2551    \u2506',
    `\u2551   ${LA}${H}${RA}`,
    `\u2551    ${B}`,
    `\u2551   ${LL} ${RL}`,
    '\u2551',
    '\u2569\u2550\u2550\u2550\u2550\u2550\u2550',
    '```',
  ];
};

export const Hangman: PluginInit = (pm) => {
  const makeReply =
    ({
      channel,
      say,
      timestamp,
    }: {
      channel: string;
      say: SayFn;
      timestamp: string;
    }) =>
    async (emoji: Emoji, message?: string) => {
      await pm.app.client.reactions.add({ channel, timestamp, name: emoji });
      if (message) await say(message);
    };

  pm.command(
    'hangman',
    {
      section: 'hangman',
      command: '!hangman',
      description: 'starts a new game of hangman',
    },
    async ({ channel, rest, timestamp, user }, { say }) => {
      log.trace('Starting new game');

      const user_id = normalizeUserId(user);
      const replyWith = makeReply({ channel, say, timestamp });

      if (rest.some) {
        await replyWith(
          Emoji.FAIL,
          `${user_id} I don't know what to do with \`${rest.value}\``
        );
        return;
      }

      if (currentGame.some) {
        await say(
          "It looks like there's a game in progress. Do you want to `!giveup`?"
        );
        await displayGame(say);
        return;
      }

      try {
        const word = await selectFromFile(WORDS_FILE, /^[a-z]+$/);
        if (word.some) {
          const newGame = new HangmanGame(word.value);
          currentGame = Some(newGame);
        }
      } catch (e) {
        currentGame = None;
      }

      if (currentGame.some) {
        await replyWith(Emoji.OK, "I've got a word. Let's play!");
        await displayGame(say);
      } else {
        await replyWith(Emoji.FAIL, 'Something went wrong. Try again?');
      }
    }
  );

  pm.command(
    'guess',
    {
      section: 'hangman',
      command: '!guess WORD',
      description: 'Make a guess about the Hangman word',
      examples: ['`!guess rosebud`'],
    },
    async ({ channel, rest, timestamp, user }, { say }) => {
      log.trace('User guessed the word');

      const user_id = normalizeUserId(user);

      const replyWith = makeReply({ channel, say, timestamp });

      if (!currentGame.some) {
        await replyWith(Emoji.FAIL, `There's no game in progress, ${user_id}.`);
        return;
      }

      if (!rest.some) {
        await replyWith(Emoji.FAIL, `What's your guess, ${user_id}?`);
        return;
      }

      const { value: game } = currentGame;
      const guess = rest.value;
      const result = game.guessWord(guess);
      if (!result.ok) await replyWith(Emoji.FAIL, result.error.message);
      await displayGame(say);
    }
  );

  pm.command(
    'letter',
    {
      section: 'hangman',
      command: '!letter LETTER',
      description: 'suggest a letter',
      examples: ['`!letter x`'],
    },
    async ({ channel, rest, timestamp, user }, { say }) => {
      log.trace('User suggested letter');

      const user_id = normalizeUserId(user);

      const replyWith = makeReply({ channel, say, timestamp });

      if (!currentGame.some) {
        await replyWith(Emoji.FAIL, `There's no game in progress, ${user_id}.`);
        return;
      }

      if (!rest.some) {
        await replyWith(Emoji.FAIL, `What letter are asking for?`);
        return;
      }

      const letter = rest.value;
      if (letter.length !== 1) {
        await replyWith(Emoji.FAIL, `One letter at a time, ${user_id}.`);
        return;
      }

      const { value: game } = currentGame;
      const result = game.suggestLetter(letter);

      if (!result.ok) {
        await replyWith(Emoji.FAIL, result.error.message);
      }

      await displayGame(say);
    }
  );

  pm.command(
    'giveup',
    {
      section: 'hangman',
      command: '!giveup',
      description: 'cancels running game and displays the word',
    },
    async ({ user }, { say }) => {
      log.trace(`Giving up`);

      if (!currentGame.some || !currentGame.value.inProgress) {
        await say(
          "There's no game in progress. Start a new one with `!hangman`"
        );
        return;
      }

      const user_id = normalizeUserId(user);
      await say(`${user_id} forfeits the game!`);

      const { value: game } = currentGame;
      game.forfeit();

      await displayGame(say);
    }
  );
};

export default Hangman;
