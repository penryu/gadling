import {
  GenericMessageEvent,
  Middleware,
  SlackEventMiddlewareArgs,
} from '@slack/bolt';
import K from 'kysely';

/*
 * Utility types
 */

export type NoneType = { _type: 'Option'; some: false };
export type SomeType<T> = { _type: 'Option'; some: true; value: T };
export type Option<T> = NoneType | SomeType<T>;

export const None: NoneType = { _type: 'Option', some: false } as const;
export const Some: <T>(arg0: T) => SomeType<T> = (value) => ({
  _type: 'Option',
  some: true,
  value,
});

export type OkType<T> = { _type: 'Result'; ok: true; value: T };
export type ErrType = { _type: 'Result'; ok: false; error: Error };
export type Result<T> = OkType<T> | ErrType;

export const Ok: <T>(value: T) => OkType<T> = (value) => ({
  _type: 'Result',
  ok: true,
  value,
});

export const Err = (error: Error | string): ErrType => ({
  _type: 'Result',
  ok: false,
  error: error instanceof Error ? error : new Error(error),
});

export type SlackEvent<T extends string> = SlackEventMiddlewareArgs<T>;

export type CommandListener = (
  cmd: BangCommand,
  event: SlackEvent<'message'>,
) => Promise<void>;
export type EventListener<T extends string> = Middleware<
  SlackEventMiddlewareArgs<T>
>;
export type MessageListener = EventListener<'message'>;

export interface BangCommand {
  channel: string;
  command: string;
  payload: GenericMessageEvent;
  rest: Option<string>;
  text: string;
  timestamp: string;
  user: string;
}

export interface CommandHandler {
  command: string;
  help: Array<string>;
  listener: CommandListener;
}

export interface MessageHandler {
  help: Array<string>;
  listener: MessageListener;
}

/*
 * Database types
 */

export interface FactTable {
  id: K.Generated<number>;
  thing: string;
  fact: string;
  inactive: boolean;
}

export type Fact = K.Selectable<FactTable>;
export type NewFact = K.Insertable<FactTable>;
export type UpdateFact = K.Updateable<FactTable>;

export interface KarmaTable {
  id: K.Generated<number>;
  thing: string;
  value: number;
}

export type Karma = K.Selectable<KarmaTable>;
export type NewKarma = K.Insertable<KarmaTable>;
export type UpdateKarma = K.Updateable<KarmaTable>;

export interface Database {
  facts: FactTable;
  karma: KarmaTable;
}
