import { normalizeUserId, selectFrom } from '../util';
import { PluginInit } from './index';

const Answers = [
  // Affirmative
  "it is certain",
  "it is decidedly so",
  "without a doubt",
  "yes definitely",
  "you may rely on it",
  "as I see it, yes",
  "most likely",
  "outlook good",
  "yes",
  "signs point to yes",
  // Maybe
  "reply hazy, try again",
  "ask again later",
  "better not tell you now",
  "cannot predict now",
  "concentrate and ask again",
  // Nope
  "don't count on it",
  "my reply is no",
  "my sources say no",
  "outlook is not so good",
  "very doubtful",
];

export const Eightball: PluginInit = (pm) => {
  pm.command('8ball', async ({ rest: question }, { payload, say }) => {
    if (payload.subtype || !payload.text) return;

    if (question.some) {
      const answer = selectFrom(Answers);
      const response = answer.some
        ? `*${question.value}*: \`${answer.value}\``
        : "Please call the plumber, I'm fresh out of predictions.";
      await say(response);
      return;
    }

    const user = normalizeUserId(payload.user);
    await say(`What's the question, ${user}`);
  });
};

export default Eightball;
