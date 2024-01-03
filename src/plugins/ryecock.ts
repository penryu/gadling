import { App } from '@slack/bolt';
import log from '../log';
import { articleFor, normalizeUserId, selectFrom } from '../util';
import { PluginInit, PluginManager } from './index';

enum Duration {
  SECOND = 1000, // in milliseconds
  MINUTE = 60 * Duration.SECOND,
  HOUR = 60 * Duration.MINUTE,
  DAY = 24 * Duration.HOUR,
}

// Time between polls for next flood
const FLOOD_POLL_INTERVAL = 10 * Duration.MINUTE;

// Minimum time to next flood
const Adjectives: Array<string> = [
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

const DeliveryDevices: Array<string> = [
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
  'colorado',
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

const OneOffs: Array<string> = [
  'My hobbies include splitting wood and serving mince.',
  'Tis better to give than receive mince!',
  '_reads the latest mince-zoological report_',
];

const Sides: Array<string> = [
  'a coco dongle',
  'mayo',
  'muppet sauce',
  'mustard',
];

/**
 * Floods the user with mince
 * @param user_id - User ID of mince recipient
 * @returns Recipient's mince gift
 */
function serve(user_id: string): string {
  const user = normalizeUserId(user_id);

  const selection = selectFrom(DeliveryDevices);
  const appetizer = `gives ${user}`;

  let entree = `mince ${selection}`;
  if (Math.random() < 0.5) {
    entree = `${selectFrom(Adjectives)} ${entree}`;
  }
  entree = `${articleFor(entree)} ${entree}`;

  if (Math.random() < 0.2) {
    entree = `${entree} with ${selectFrom(Sides)}`;
  }

  return `_${appetizer} ${entree}_`;
}

/**
 * Invokes the mince monster, targeting a user if available
 * @param [user_id] - User ID of user to flood
 * @returns The resulting mince concoction
 */
function flood(user_id: string): string {
  if (Math.random() < 0.01) {
    return selectFrom(OneOffs);
  }

  return serve(user_id);
}

export class Ryecock {
  app: App;
  pm: PluginManager;

  constructor(pm: PluginManager) {
    this.app = pm.app;
    this.pm = pm;
  }

  /**
   * Periodically floods all members of the given channel
   * @param channelName - name of the channel to flood at intervals
   */
  async autoFlood(channelName: string) {
    log.info(`Setting ${channelName} to auto-flood!`);

    // fetch channel list
    const { channels } = await this.app.client.conversations.list();
    // find channel id by name
    const chan_id = channels?.find((ch) => ch.name === channelName)?.id;

    if (!chan_id) {
      log.error(`Channel ${channelName} doesn't exist to flood! Aborting...`);
      return;
    }

    const randomTimeout = () =>
      FLOOD_POLL_INTERVAL + Math.random() * Duration.MINUTE;

    const callback = () => {
      void this.floodChannel(chan_id).finally(() =>
        setTimeout(callback, randomTimeout()),
      );
    };

    setTimeout(callback, randomTimeout());
  }

  /**
   * Floods all members of a channel with mince
   * @param channel - The channel ID of the channel to flood
   */
  async floodChannel(channel: string) {
    log.info(`Flooding ${channel}!`);

    const { client } = this.app;
    const { members } = await client.conversations.members({ channel });
    if (members) {
      await Promise.all(
        members.map(async (user_id) => {
          const { user } = await client.users.info({ user: user_id });
          if (user && !user.is_bot) {
            const text = flood(user_id);
            await client.chat.postMessage({ channel, text });
          }
        }),
      );
    }
  }
}

export const init: PluginInit = (pm) => {
  const ryecock = new Ryecock(pm);

  pm.command(
    'serve',
    {
      section: 'ryecock',
      command: '!serve RECIPIENT',
      description: 'Ensures the recipient receives the US RDA of mince',
      examples: ['`!serve @guest`'],
    },
    async ({ rest, user }, { say }) => {
      if (!rest.some) return;

      const [recipient] = rest.value.split(/\s+/, 2);

      await say(serve(recipient || user));
    },
  );

  pm.command(
    'flood',
    {
      section: 'ryecock',
      command: '!flood',
      description: 'Flood the channel with mince',
      examples: ['`!flood`'],
    },
    async ({ channel }) => {
      await ryecock.floodChannel(channel);
    },
  );

  pm.message(
    {
      section: 'ryecock',
      description: 'Mention `mince` and ye shall receive',
    },
    async ({ payload, say }) => {
      if (payload.subtype || !payload.text) return;

      const { text, user } = payload;
      if (user && text.match(/\bmince\b/i)) {
        await say(flood(payload.user));
      }
    },
  );
};

export default init;
