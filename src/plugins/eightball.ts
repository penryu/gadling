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

function ask(_question: string): string {
  const i = Math.floor(Math.random() * Answers.length);
  return Answers[i] ?? 'Your outlook is bleak';
}

export const init: PluginInit = (reg) => {
  reg.message(async ({ payload, say }) => {
    if (payload.subtype) return;

    const { text } = payload;
    const m = text?.match(/^8ball:?\s+(.+)$/i);

    if (m && m[1]) {
      const question = m[1];
      await say(`\`${question}\`:\n>${ask(question)}`);
    }
  });
};

export default init;
