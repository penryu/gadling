import { SayFn } from '@slack/bolt';
import { env } from 'process';
import { Emoji } from '../constants';
import log from '../log';
import { Err, None, Ok, Option, Result, Some } from '../types';
import { normalizeUserId, selectFromFile } from '../util';
import { PluginInit } from './index';

const WORDS_FILE = env.WORDS_PATH || '/usr/share/dict/words';
const MIN_WORD_LENGTH = 6;

enum HangmanOutcome {
  ALIVE = 'ALIVE',
  DEAD = 'DEAD',
  FORFEIT = 'FORFEIT',
  IN_PROGRESS = 'IN_PROGRESS',
}

class HangmanGame {
  private static readonly ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
  private static readonly DEAD_LIMBS = 7;
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

  public get wordLength(): number {
    return this._word.length;
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

  solveWord(guess: string): Result<HangmanOutcome> {
    log.debug(`User guessed "${guess}"`);

    guess = guess.toLowerCase();

    if (!this.inProgress) return Err('The game is over!');

    if (guess === this._word) {
      this._word.split('').forEach((c) => this._suggested.add(c));
      this._outcome = HangmanOutcome.ALIVE;
    } else {
      ++this._limbs;
    }

    this.evaluate();
    return Ok(this._outcome);
  }

  guessLetter(letter: string): Result<boolean> {
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

    const lettersGuessed = redactedWord.toUpperCase().split('').join(' ');
    const lettersMissed = missed.map((c) => `\`${c.toUpperCase()}\``).join(' ');

    const output = [
      ...renderGallows(game),
      `The word so far: \`${lettersGuessed}\``,
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
  const RP = limbs >= 7 ? '\u2506' : ' ';

  return [
    '```',
    '\u2554\u2550\u2550\u2550\u2550\u2555',
    `\u2551    ${RP}`,
    `\u2551   ${LA}${H}${RA}`,
    `\u2551    ${B}`,
    `\u2551   ${LL} ${RL}`,
    '\u2569\u2550\u2550\u2550\u2550\u2550\u2550',
    '```',
  ];
};

export const Hangman: PluginInit = (pm) => {
  const isValidChannel = async (
    say: SayFn,
    channel: string,
  ): Promise<boolean> => {
    const hangmanChannel = env.HANGMAN_CHANNEL;
    log.info('Verifying current channel %s === %s', channel, hangmanChannel);
    if (!hangmanChannel || hangmanChannel === channel) return true;

    await say(`Join me in the <#${hangmanChannel}> channel!`);
    log.info('Refusing to play hangman from %s', channel);
    return false;
  };

  type ReplyFn = (emoji: Emoji, message?: string) => Promise<void>;

  const makeReply =
    ({
      channel,
      say,
      timestamp,
    }: {
      channel: string;
      say: SayFn;
      timestamp: string;
    }): ReplyFn =>
    async (emoji: Emoji, message?: string) => {
      await pm.app.client.reactions.add({ channel, timestamp, name: emoji });
      if (message) await say(message);
    };

  const userSolvePuzzle = async ({
    channel,
    replyWith,
    say,
    user_id,
    word,
  }: {
    channel: string;
    replyWith: ReplyFn;
    say: SayFn;
    word: string;
    user_id: string;
  }) => {
    log.trace(`${user_id} attempted to solve with ${word}`);

    if (!(await isValidChannel(say, channel))) return;

    if (!currentGame.some) {
      await replyWith(Emoji.FAIL, `There's no game in progress, ${user_id}.`);
      return;
    }

    const { value: game } = currentGame;
    const result = game.solveWord(word);
    if (!result.ok) await replyWith(Emoji.FAIL, result.error.message);
    await displayGame(say);
  };

  const userSuggestLetter = async ({
    channel,
    letter,
    replyWith,
    say,
    user_id,
  }: {
    channel: string;
    letter: string;
    replyWith: ReplyFn;
    say: SayFn;
    user_id: string;
  }) => {
    log.trace(`${user_id} suggested letter ${letter}`);

    if (!(await isValidChannel(say, channel))) return;

    if (!currentGame.some) {
      await replyWith(Emoji.FAIL, `There's no game in progress, ${user_id}.`);
      return;
    }

    const { value: game } = currentGame;
    const result = game.guessLetter(letter);

    if (!result.ok) await replyWith(Emoji.FAIL, result.error.message);

    await displayGame(say);
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
      if (!(await isValidChannel(say, channel))) return;

      const user_id = normalizeUserId(user);

      const replyWith = makeReply({ channel, say, timestamp });

      if (rest.some) {
        await replyWith(
          Emoji.FAIL,
          `${user_id} I don't know what to do with \`${rest.value}\``,
        );
        return;
      }

      if (currentGame.some) {
        await say(
          "It looks like there's a game in progress. Do you want to `!giveup`?",
        );
        await displayGame(say);
        return;
      }

      try {
        const re = new RegExp(`^[a-z]{${MIN_WORD_LENGTH},}$`);
        const word = await selectFromFile(WORDS_FILE, re);
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
    },
  );

  pm.command(
    'solve',
    {
      section: 'hangman',
      command: '!solve WORD',
      description: 'Attempt to solve the puzzle word',
      examples: ['`!solve rosebud`'],
    },
    async ({ channel, rest, timestamp, user }, { say }) => {
      log.trace(`${user} attempted to solve the puzzle`);

      if (!(await isValidChannel(say, channel))) return;

      const replyWith = makeReply({ channel, say, timestamp });
      const user_id = normalizeUserId(user);

      if (!currentGame.some) {
        await replyWith(Emoji.FAIL, `There's no game in progress, ${user_id}.`);
        return;
      }

      if (!rest.some) {
        await replyWith(Emoji.FAIL, `What's your guess, ${user_id}?`);
        return;
      }

      const word = rest.value;
      await userSolvePuzzle({ channel, replyWith, say, user_id, word });
    },
  );

  pm.command(
    'guess',
    {
      section: 'hangman',
      command: '!guess LETTER',
      description: 'suggest a letter',
      examples: ['`!guess x`'],
    },
    async ({ channel, rest, timestamp, user }, { say }) => {
      log.trace(`${user} guessed a letter`);

      if (!(await isValidChannel(say, channel))) return;

      const replyWith = makeReply({ channel, say, timestamp });
      const user_id = normalizeUserId(user);

      if (!rest.some) {
        await replyWith(Emoji.FAIL, `What letter are asking for, ${user_id}?`);
        return;
      }

      const letter = rest.value;
      if (letter.length !== 1) {
        await replyWith(Emoji.FAIL, `One letter at a time, ${user_id}.`);
        return;
      }

      await userSuggestLetter({ channel, letter, replyWith, say, user_id });
    },
  );

  pm.command(
    'giveup',
    {
      section: 'hangman',
      command: '!giveup',
      description: 'cancels running game and displays the word',
    },
    async ({ user, channel }, { say }) => {
      log.trace(`Giving up`);
      if (!(await isValidChannel(say, channel))) return;

      if (!currentGame.some || !currentGame.value.inProgress) {
        await say(
          "There's no game in progress. Start a new one with `!hangman`",
        );
        return;
      }

      const user_id = normalizeUserId(user);
      await say(`${user_id} forfeits the game!`);

      const { value: game } = currentGame;
      game.forfeit();

      await displayGame(say);
    },
  );

  pm.message(
    {
      section: 'hangman',
      description: 'Guess a letter by using it alone on a line',
    },
    async ({ event, payload, say }) => {
      if (payload.subtype || !payload.text || !currentGame.some) return;

      const { text: letter, user } = payload;
      if (user && letter.length === 1 && letter.match(/[A-Za-z]/)) {
        const { channel, ts: timestamp } = event;
        const replyWith = makeReply({ channel, say, timestamp });
        const user_id = normalizeUserId(user);
        await userSuggestLetter({ channel, letter, replyWith, say, user_id });
      }
    },
  );

  pm.message(
    {
      section: 'hangman',
      description: 'Solve by using the word alone on a line',
    },
    async ({ event, payload, say }) => {
      if (payload.subtype || !payload.text || !currentGame.some) return;

      const { text: word, user } = payload;
      if (!user || !word.match(/[A-Za-z]/)) return;

      const game = currentGame.value;
      if (word.length === game.wordLength) {
        const { channel, ts: timestamp } = event;
        const replyWith = makeReply({ channel, say, timestamp });
        const user_id = normalizeUserId(user);
        await userSolvePuzzle({ channel, replyWith, say, user_id, word });
      }
    },
  );
};

export default Hangman;
