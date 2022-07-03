import { Logger, LogLevel } from '@slack/bolt';
import Pino from 'pino';

export const log = Pino({
  level: "trace",
  name: "hob",
  transport: {
    options: {
      colorize: true,
      ignore: 'hostname,name,pid',
      translateTime: true,
    },
    target: "pino-pretty" },
});

export const trace = log.trace;
export const debug = log.debug;
export const info = log.info;
export const warn = log.warn;
export const error = log.error;

class SlackLogger implements Logger {
  // slackLevel: LogLevel;

  // constructor() {
  //   this.slackLevel = this.getLevel();
  // }

  debug = (args: unknown[]): void => log.debug(args);
  info  = (args: unknown[]): void => log.info(args);
  warn  = (args: unknown[]): void => log.warn(args);
  error = (args: unknown[]): void => log.error(args);

  setLevel(level: LogLevel): void {
    log.info(`Ignoring attempt to change log level to ${level}`);
  }

  getLevel(): LogLevel {
    const level = (log.level === 'trace') ? 'debug' : log.level;
    return level as LogLevel;
  }

  setName(name: string): void {
    log.info(`Ignoring attempt to change logger name to ${name}`);
  }
}

export const slackLogger = new SlackLogger();

export default log;
