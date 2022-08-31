import { EventFromType, KnownEventFromType } from '@slack/bolt';
import * as fs from 'fs';
import readline from 'readline/promises';
import { BangCommand, None, Option, Some } from './types';
import { log } from './log';

export function articleFor(term: string): string {
  return term.match(/^[aeiou]/) ? 'an' : 'a';
}

export function expandPath(path: string): string {
  if (!process.env.HOME || !path) return path;

  const { HOME } = process.env;

  return path.replace(/~(?=\/)/, HOME).replace(/\$HOME(?=\/)/, HOME);
}

export function normalizeUserId(id: string): string {
  return id.startsWith('<@') ? id : `<@${id}>`;
}

export function parseBangCommand(
  payload: KnownEventFromType<'message'>
): Option<BangCommand> {
  if (payload.subtype || !payload.text) return None;

  const m = payload.text.match(/^!(\S+)(?:\s+(.+))?$/);
  if (m) {
    const command = m[1] as string;
    const rest = m[2] ? Some(m[2].trim()) : None;
    const { channel, text, ts: timestamp, user } = payload;
    return Some({ channel, command, payload, rest, text, timestamp, user });
  }

  return None;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function parseJson<T>(str: string): Promise<Option<T>> {
  try {
    const json = JSON.parse(str) as T;
    return Some(json);
  } catch (e) {
    return None;
  }
}

export function selectFrom<T>(xs: Array<T>): T {
  const idx = Math.floor(Math.random() * xs.length);
  return xs[idx] as T;
}

export async function selectFromFile(
  path: string,
  pattern?: RegExp
): Promise<Option<string>> {
  log.debug('Selecting lines from %s matching %s', path, pattern);

  const input = fs.createReadStream(path, { encoding: 'utf8' });
  const dict = readline.createInterface({ input, crlfDelay: Infinity });

  let word: Option<string> = None;

  // tracks the different words selected throughout the scan
  const selections = [];

  // count lines scanned for accurate verdict odds
  let lines = 0;

  for await (const line of dict) {
    if (pattern && !line.match(pattern)) continue;
    const verdict = Math.random() * ++lines < 1;

    if (verdict) {
      selections.push(lines);
      word = Some(line);
    }
  }

  return word;
}

export const sleep = async (ms: number) =>
  new Promise((res, _rej) => {
    setTimeout(res, ms);
  });

export const userFromPayload = (
  payload: EventFromType<'message'>
): Option<string> => {
  return !payload.subtype && payload.text ? Some(payload.user) : None;
};
