import { SayArguments, SlashCommand } from '@slack/bolt';
import { flood } from './ryecock';

export const Emus: Record<string, Function> = {
  ptweak: (_command: SlashCommand) => "WUTEVA! I DO WHAT I WAN!",
  ryecock: (command: SlashCommand) => flood(command.user_id),
};

export function beHelpful(user_id: string): SayArguments | string {
  const emuList = Object.keys(Emus)
    .sort()
    .map((name) => `• ${name}`)
    .join('\n');

  return `Who should I be, <@${user_id}>?\n${emuList}`
}

