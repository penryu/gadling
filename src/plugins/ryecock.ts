import { App } from '@slack/bolt';
import { PluginInit } from './index';
import { articleFor, normalizeUserId, selectFrom } from '../util';

const chilify = (user_id: string): string => {
  const appetizer = `gives ${normalizeUserId(user_id)}`;

  let entree = `chili ${selectFrom(DeliveryDevices)}`;
  if (Math.random() < 0.5) {
    entree = `${selectFrom(Adjectives)} ${entree}`;
  }
  entree = `${articleFor(entree)} ${entree}`;

  if (Math.random() < 0.2) {
    const side = selectFrom(Sides);
    entree = `${entree} with ${side}`;
  }

  return `_${appetizer} ${entree}_` ?? selectFrom(OneOffs);
}

export const flood = (user_id: string): string => {
  console.debug({user_id});

  if (Math.random() < 0.1 || !user_id) return selectFrom(OneOffs);

  return chilify(user_id);
};

const Adjectives = [
  'animal style',
  'appreciative',
  'canadian',
  'cheetah',
  'cold',
  'double',
  'east coast',
  'elastic',
  'emergency',
  'evening',
  'frothy',
  'golden',
  'late',
  'late night',
  'morning',
  'pink',
  'power',
  'quantum',
  'red',
  'saturday',
  'standing',
  'value',
  'virtual',
];

const DeliveryDevices = [
  'amoeba',
  'animal',
  'anteater',
  'bear',
  'blue whale',
  'brontosaurus',
  'bug',
  'canal',
  'cat',
  'chicken',
  'chinchilla',
  'coelecanth',
  'dire wolf',
  'dog',
  'doge',
  'donut',
  'dragon',
  'elephant',
  'enchilada',
  'ferret',
  'ghost',
  'godzilla',
  'hug',
  'jellyfish',
  'kangaroo',
  'mammoth',
  'monkey',
  'monster',
  'moose',
  'nuke',
  'opossum',
  'owl',
  'pangolin',
  'penis',
  'pig',
  'platypus',
  'polar bear',
  'pufferfish',
  'puma',
  'saint bernard',
  'skunk',
  'snake',
  'sock',
  'space reptile',
  'sperm whale',
  'sundae',
  'tapir',
  'troll',
  'unicorn',
  'vat',
  'walrus',
  'warthog',
  'weasel',
  'whale',
  'wolf',
  'wolverine',
];

const OneOffs = [
  'My hobbies include splitting wood and giving chili dogs.',
  'Tis better to give than receive chili dogs!',
  '_reads the latest chilizoological report_',
];

const Sides = [
  'a blue sock',
  'a coco dongle',
  'cold semen',
  'mayo',
  'muppet sauce',
  'mustard',
  'a pink sock',
  'a red sock',
];

async function floodChannel(app: App, channelName: string) {
  const hour = 3600000;
  const randomTimeout = () => (8 * hour) + (Math.random() * 12 * hour);

  // destruct the api methods
  const { chat, conversations } = app.client;
  // fetch channel list
  const channelList = await conversations.list();
  // find channel by name
  const channel = channelList?.channels?.find(ch => ch.name === channelName)?.id!;

  const callback = async () => {
    const response = await conversations.members({ channel });
    const users = response.members;
    if (users) {
      await Promise.all(users
        .map(user_id => {
        chat.postMessage({ channel, text: flood(user_id) });
      }));
      setTimeout(callback, randomTimeout());
    }
  };

  setTimeout(callback, randomTimeout());
}

export const init: PluginInit = (reg) => {
  reg.command('/chilify', async ({ack, command, say}) => {
    await ack();

    const [recipient, ..._args] = command.text.split(/\s+/, 2);
    await say(chilify(recipient || command.user_id));
  });

  reg.mention(async ({ payload, say }) => {
    if (payload.text && payload.user) {
      if (payload.text.match(/\bchili\b/)) {
        await say(flood(payload.user));
      }
    }
  });

  reg.message(async ({ payload, say }) => {
    console.log('MESSAGE', payload);

    const obj = payload as any;
    if (obj?.text && obj?.user) {
      if (obj.text.match(/\bchili\b/)) {
        await say(flood(obj.user));
      }
    }
  });

  floodChannel(reg.app, 'general');
};



export default init;
