import { normalizeUserId, selectFrom, sleep } from '../util';

import { PluginInit } from './index';

const ResponseTable: Array<[RegExp, Array<string>]> = [
  [
    /\b(hello|hi)\b/i,
    [
      'ciao',
      'greetings',
      'hallå',
      'hello',
      'hej',
      'hey',
      'hi',
      'hola',
      'こんにちは',
    ],
  ],
  [
    /\b(bye|so long|ttfn)\b/i,
    [
      'adiós',
      'bye',
      'ciao',
      'goodbye',
      'hejdå',
      'see ya',
      'so long',
      'さよなら',
    ],
  ],
  [
    /\b(gracias|thank you|thanks|ty)\b/i,
    [
      'de nada',
      "don't mention it",
      'no problem!',
      "you're welcome!",
      'varsågod!',
      'どういたしまして',
    ],
  ],
];

export const init: PluginInit = (pm) => {
  pm.message(
    {
      section: 'pleasantries',
      description: '`today` will display the current day of the week',
    },
    async ({ payload, say }) => {
      if (payload.subtype !== undefined) return;

      if (payload.text?.match(/^\s*today(?:\.|\?)*\s*$/i)) {
        const dow = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];

        await say('Today is...');
        await sleep(2000);
        const today = dow[new Date().getDay()] ?? 'just another day';
        await say(today);
      }
    }
  );

  pm.message(
    {
      section: 'pleasantries',
      description: 'I try to be polite',
    },
    async ({ payload, say }) => {
      if (payload.subtype !== undefined) return;

      const { text, user } = payload;
      if (!text) return;

      const user_tag = normalizeUserId(user);

      for (const [regex, responses] of ResponseTable) {
        if (text.match(regex)) {
          const message = selectFrom(responses);
          await say(`${user_tag} ${message}`);
          return;
        }
      }
    }
  );
};

export default init;
