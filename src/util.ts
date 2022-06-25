export function articleFor(term: string): string {
  return term.match(/^[aeiou]/) ? 'an' : 'a';
}

export function expandPath(path: string | undefined): string | undefined {
  if (!process.env.HOME || !path) return path;

  const { HOME } = process.env;

  return path
    .replace(/~(?=\/)/, HOME)
    .replace(/\$HOME(?=\/)/, HOME);
}

export function normalizeUserId(id: string): string {
  return id.includes('<@') ? id : `<@${id}>`;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function parseJson<T>(str: string): Promise<T> {
  return JSON.parse(str) as T;
}

export function selectFrom<T>(xs: Array<T>): T {
  const idx = Math.floor(Math.random() * xs.length);
  return xs[idx] as unknown as T;
}

export const sleep = async (ms: number) =>
  new Promise((res, _rej) => {
    setTimeout(res, ms);
  });

