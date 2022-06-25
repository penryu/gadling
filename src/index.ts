#!/usr/bin/env node
import { homedir } from 'os';
import { join } from 'path';
import { App } from '@slack/bolt';

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: join(homedir(), ".config/hob/config") });

import { Db } from './db';
import { initializePlugins } from './plugins';

const app = new App({
  appToken: process.env.SLACK_APP_TOKEN,
  developerMode: Boolean(process.env.DEVELOPER_MODE),
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  token: process.env.SLACK_BOT_TOKEN,
});

initializePlugins(app);

(async () => {
  await Db();
  await app.start();
})().catch(console.error);
