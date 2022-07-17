import { EventFromType, KnownEventFromType } from '@slack/bolt';
import { BangCommand, None, Option, Some } from './types';

export function articleFor(term: string): string {
  return term.match(/^[aeiou]/) ? 'an' : 'a';
}

export function expandPath(path: string): string {
  if (!process.env.HOME || !path) return path;

  const { HOME } = process.env;

  return path
    .replace(/~(?=\/)/, HOME)
    .replace(/\$HOME(?=\/)/, HOME);
}

export function normalizeUserId(id: string): string {
  return id.startsWith('<@') ? id : `<@${id}>`;
}

export function parseBangCommand(payload: KnownEventFromType<'message'>): Option<BangCommand> {
  if (payload.subtype || !payload.text) return None;

  const m = payload.text.match(/^!(\S+)(?:\s+(.+))?$/);
  if (m) {
    const command = m[1] as string;
    const rest = m[2] ? Some(m[2].trim()) : None;
    const { channel, text, ts: timestamp, user } = payload;
    return Some({ channel, command, rest, text, timestamp, user });
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

export function selectFrom<T>(xs: Array<T> | undefined | null): Option<T> {
  if (xs && xs.length > 0) {
    const idx = Math.floor(Math.random() * xs.length);
    const selection = xs[idx];
    if (selection != undefined) return Some(selection);
  }

  return None;
}

export const sleep = async (ms: number) =>
  new Promise((res, _rej) => {
    setTimeout(res, ms);
  });

export const userFromPayload = (payload: EventFromType<'message'>): Option<string> => {
  return !payload.subtype && payload.text ? Some(payload.user) : None;
};
