#!/usr/bin/env node
import { homedir } from 'os';
import { join } from 'path';
import { App } from '@slack/bolt';
import { initializePlugins } from './plugins';

require("dotenv").config({ path: join(homedir(), ".config/hob/config") });

const app = new App({
  appToken: process.env.SLACK_APP_TOKEN,
  developerMode: true,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  token: process.env.SLACK_BOT_TOKEN,
});

initializePlugins(app);

(async () => {
  await app.start(process.env.PORT || 3000);
})();
