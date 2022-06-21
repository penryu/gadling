#!/usr/bin/env node
import { homedir } from 'os';
import { join } from 'path';
import { App } from '@slack/bolt';
import { beHelpful, Emus } from './be';
import { chilify, flood } from './ryecock';

require("dotenv").config({ path: join(homedir(), ".config/hob/config") });

const app = new App({
  appToken: process.env.SLACK_APP_TOKEN,
  developerMode: true,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  token: process.env.SLACK_BOT_TOKEN,
});

app.command('/chilify', async ({ack, command, say}) => {
  await ack();
  console.log('/chilify', {command});

  const [recipient, ..._args] = command.text.split(/\s+/, 2);

  await say(chilify(recipient || command.user_id));
});

app.command('/be', async ({ack, command, say}) => {
  await ack();
  console.log('/be', {command});

  const { user_id, text } = command;
  const [emu, ...args] = text.split(/\s+/);

  if (emu === 'false') {
    await say(`And it must follow, as the night the day, Thou canst not then be false to any man.`);
  } else if (!emu) {
    await say(beHelpful(user_id));
  } else if (Emus[emu]) {
    await say(Emus[emu]?.(command, args));
  } else {
    await say(`<@${user_id}> My ${emu} emu is down at the moment.`);
  }
});

app.event('app_mention', async ({ event, payload, say}) => {
  console.log('app_mention', { event, payload });

  if (payload.text.includes("help")) {
    await say([
      '*Commands*:',
      ' - `/be`',
      ' - `/chilify`',
      '*Triggers*:',
      ' - `chili`',
      ' - `help`',
      '_Note that triggers currently require addressing me directly._',
      'Examples:',
      ' - `/be ryecock`',
      ' - `/chilify @hob`',
      ' - `@hob give me chili`',
    ].join('\n'));
  }

  if (payload.text.includes('chili') && payload.user) {
    await say(flood(payload.user));
  }
});

app.message(async (arg) => {
  console.log({arg});
  await arg.say('please hold for incoming chili dog');
});

(async () => {
  await app.start(process.env.PORT || 3000);
})();
