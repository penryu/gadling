import * as assert from 'assert';

export function articleFor(term: string): string {
  return term.match(/^[aeiou]/) ? 'an' : 'a';
}

export function normalizeUserId(id: string): string {
  return id.includes('<@') ? id : `<@${id}>`;
}

export function selectFrom<T>(xs: Array<T>): T {
  assert.ok(xs.length > 0);
  const idx = Math.floor(Math.random() * xs.length);
  return xs[idx]!;
};

