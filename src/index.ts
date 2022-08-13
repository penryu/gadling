#!/usr/bin/env node
import os from 'os';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { App } from '@slack/bolt';

import { getPool } from './db';
import { log, SlackLogger } from './log';
import { initializePlugins } from './plugins';

dotenvConfig({ path: path.join(os.homedir(), ".config/hob/env") });

void (async () => {
  const app = new App({
    appToken: process.env.SLACK_APP_TOKEN as string,
    developerMode: Boolean(process.env.DEVELOPER_MODE),
    logger: new SlackLogger(),
    socketMode: true,
    token: process.env.SLACK_BOT_TOKEN as string,
  });

  // Initiate database connection
  getPool();

  initializePlugins(app);

  await app.start();
})().catch((reason) => {
  log.error("Encountered fatal error: %s", reason);
  process.exit(7);
});
