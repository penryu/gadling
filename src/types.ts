import {
  SlackCommandMiddlewareArgs,
  SlackEventMiddlewareArgs,
} from "@slack/bolt";

import { Middleware } from '@slack/bolt';

export type MessageTypes = 'app_mention' | 'command' | 'event' | 'message';

export type SlackArgs = SlackEventMiddlewareArgs;
export type SlackCommand = SlackCommandMiddlewareArgs;
export type SlackEvent<T extends string> = SlackEventMiddlewareArgs<T>;
export type SlackMention = SlackEvent<'app_mention'>;
export type SlackMessage = SlackEvent<'message'>;

export type SlackListener = (arg0: SlackArgs) => void;
export type CommandListener = Middleware<SlackCommandMiddlewareArgs>;
export type EventListener<T extends string> = Middleware<SlackEventMiddlewareArgs<T>>;
export type MentionListener = EventListener<'app_mention'>;
export type MessageListener = EventListener<'message'>;

