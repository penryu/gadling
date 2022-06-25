import { PluginInit } from './index';
import { SayArguments, SlashCommand } from '@slack/bolt';
import { Ryecock } from './ryecock';

type EmuHandler = (
  command: SlashCommand,
  ...args: Array<unknown>
) => SayArguments | string;

const Emus: Record<string, EmuHandler> = {
  polonius: () => ({
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: '>And it must follow, as the night the day,\n>Thou canst not then be `false` to any man.',
      },
    }],
  }),
  ptweak: () => "WUTEVA! I DO WHAT I WAN!",
  ryecock: (command: SlashCommand) => Ryecock.flood(command.user_id),
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
    const ps: Array<Promise<unknown>> = [ack()];

    console.log('command:/be', {payload});

    const { user_id, text } = payload;
    const [name, ...args] = text.split(/\s+/, 2);

    if (!name) {
      ps.push(say(beHelpful(user_id)));
    } else if (name === 'false' && Emus['polonius']) {
      ps.push(say(Emus['polonius'](payload, ...args)));
    } else if (Emus[name]) {
      const handler = Emus[name];
      if (handler) ps.push(say(handler(payload, ...args)));
    } else {
      await say(`<@${user_id}> My ${name} emu is down at the moment.`);
    }

    await Promise.all(ps);
  });
};

export default init;
