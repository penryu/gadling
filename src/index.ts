#!/usr/bin/env node
import os from 'os';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { App } from '@slack/bolt';

import { Db } from './db';
import { log, slackLogger } from './log';
import { initializePlugins } from './plugins';

dotenvConfig({ path: path.join(os.homedir(), ".config/hob/config") });

void (async () => {
  const app = new App({
    appToken: process.env.SLACK_APP_TOKEN,
    developerMode: Boolean(process.env.DEVELOPER_MODE),
    logger: slackLogger,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    token: process.env.SLACK_BOT_TOKEN,
  });

  initializePlugins(app);

  await Db();
  await app.start();
})().catch((reason) => {
  log.error("Encountered fatal error: %s", reason);
  process.exit(7);
});
