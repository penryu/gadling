import { None, SomeType, Some } from './types';
import {
  articleFor,
  expandPath,
  normalizeUserId,
  parseBangCommand,
  parseJson,
  selectFrom,
  sleep,
} from "./util";

const HOME = '/usr/home/joe';

describe("articleFor", () => {
  it("adds an a", () => {
    const term = 'test';
    expect(articleFor(term)).toBe('a');
  });

  it("adds an an", () => {
    const term = 'exam';
    expect(articleFor(term)).toBe('an');
  });
});

describe("expandPath", () => {
  beforeAll(() => {
    process.env['HOME'] = HOME;
  });

  it("returns a path without variables unchanged", () => {
    const input = "HOME";
    expect(expandPath(input)).toEqual(input);
  });

  it("expands the tilde (~)", () => {
    const file = 'test.doc';
    expect(expandPath(`~/${file}`)).toEqual(`${HOME}/${file}`);
  });

  it('expands the HOME env var $HOME', () => {
    const file = 'test.doc';
    expect(expandPath(`$HOME/${file}`)).toEqual(`${HOME}/${file}`);
  });
});

describe('normalizeUserId', () => {
  it('returns unchanged if <@...> tag present', () => {
    const user = '<@C123456>';
    expect(normalizeUserId(user)).toBe(user);
  });

  it('adds <@...> tag if not present', () => {
    const user = 'joe';
    expect(normalizeUserId(user)).toBe(`<@${user}>`);
  });
});

describe('parseBangCommand', () => {
  it('returns None for invalid command', () => {
    const input = 'not a bang command';
    expect(parseBangCommand(input)).toEqual(None);
  });

  it('returns value for command with no arguments', () => {
    const text = '!pass';
    expect(parseBangCommand(text)).toEqual(Some({
      command: 'pass',
      rest: None,
      text,
    }));
  });

  it('returns value for command with arguments', () => {
    const text = '!pass the salt';
    expect(parseBangCommand(text)).toEqual(Some({
      command: 'pass',
      rest: Some('the salt'),
      text,
    }));
  });
});

describe('parseJson', () => {
  it('returns None for undefined', async () => {
    const input = '[ undefined ]';
    expect(await parseJson(input)).toEqual(None);
  });

  it('returns None for unparseable text', async () => {
    const input = '[ 1, 3, }';
    expect(await parseJson(input)).toEqual(None);
  });

  it('returns Some value for valid JSON', async () => {
    const input = '{ "name": "Joe", "numbers": [1, 2, 3] }';
    expect(await parseJson(input)).toEqual(Some({
      name: 'Joe',
      numbers: [1, 2, 3],
    }));
  });
});

describe('selectFrom', () => {
  it('returns None for undefined', () => {
    expect(selectFrom(undefined)).toEqual(None);
  });

  it('returns None for null', () => {
    expect(selectFrom(null)).toEqual(None);
  });

  it('returns None for empty arrays', () => {
    expect(selectFrom([])).toEqual(None);
  });

  it('returns Some for array of 1 element', () => {
    expect(selectFrom([42])).toEqual(Some(42));
  });

  it('returns Some for array of multiple elements', () => {
    const list = [1, 2, 3];
    const selected = selectFrom(list) as SomeType<number>;
    expect(selected.some).toBe(true);
    const result = list.includes(selected.value);
    expect(result).toBe(true);
  });
});

describe('sleep', () => {
  it('sleeps for specified milliseconds (+/- 5ms)', async () => {
    const ms = 200;
    const start = Date.now();
    await sleep(ms);
    const delta = Date.now() - start;
    expect(delta - ms).toBeLessThan(5);
  });
});
