import { PluginInit } from './index';
import { SayArguments, SlashCommand } from '@slack/bolt';
import { flood } from './ryecock';

const Emus: Record<string, Function> = {
  polonius: (_command: SlashCommand) => ({
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: '>And it must follow, as the night the day,\n>Thou canst not then be `false` to any man.',
      },
    }],
  }),
  ptweak: (_command: SlashCommand) => "WUTEVA! I DO WHAT I WAN!",
  ryecock: (command: SlashCommand) => flood(command.user_id),
};

function beHelpful(user_id: string): SayArguments | string {
  const emuList = Object.keys(Emus)
    .sort()
    .map((name) => `• ${name}`)
    .join('\n');

  return `Who should I be, <@${user_id}>?\n${emuList}`
}

export const init: PluginInit = (reg) => {
  reg.command('/be', async ({ack, payload, say}) => {
    await ack();
    console.log('command:/be', {payload});

    const { user_id, text } = payload;
    const [emu, ...args] = text.split(/\s+/, 2);

    if (emu === 'false') {
      await say(Emus['polonius']?.(payload, args));
    } else if (!emu) {
      await say(beHelpful(user_id));
    } else if (Emus[emu]) {
      await say(Emus[emu]?.(payload, args));
    } else {
      await say(`<@${user_id}> My ${emu} emu is down at the moment.`);
    }
  });
};

export default init;
