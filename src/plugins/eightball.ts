import { normalizeUserId, selectFrom } from '../util';
import { PluginInit } from './index';

const Answers = [
  // Affirmative
  'it is certain',
  'it is decidedly so',
  'without a doubt',
  'yes definitely',
  'you may rely on it',
  'as I see it, yes',
  'most likely',
  'outlook good',
  'yes',
  'signs point to yes',
  // Maybe
  'reply hazy, try again',
  'ask again later',
  'better not tell you now',
  'cannot predict now',
  'concentrate and ask again',
  // Nope
  "don't count on it",
  'my reply is no',
  'my sources say no',
  'outlook is not so good',
  'very doubtful',
];

export const Eightball: PluginInit = (pm) => {
  pm.command(
    '8ball',
    {
      section: '8ball',
      command: '!8ball',
      description: 'asks the Magic 8-ball for the answers you seek',
      examples: ['`8ball Will I win the lottery?`'],
    },
    async ({ rest: question, user }, { say }) => {
      if (question.some) {
        const answer = selectFrom(Answers);
        await say(`*${question.value}*: \`${answer}\``);
        return;
      }

      await say(`What's the question, ${normalizeUserId(user)}`);
    },
  );
};

export default Eightball;
