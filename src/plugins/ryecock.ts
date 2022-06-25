import { App } from '@slack/bolt';

import { articleFor, normalizeUserId, selectFrom } from '../util';
import { PluginInit, Registry } from './index';

export class Ryecock {
  /**
   * Static
   */

  static readonly Adjectives: Array<string> = [
    "animal style",
    "appreciative",
    "canadian",
    "cheetah",
    "cold",
    "double",
    "east coast",
    "elastic",
    "emergency",
    "evening",
    "frothy",
    "golden",
    "late",
    "late night",
    "morning",
    "pink",
    "power",
    "quantum",
    "red",
    "saturday",
    "standing",
    "value",
    "virtual",
  ];

  static readonly DeliveryDevices: Array<string> = [
    "amoeba",
    "animal",
    "anteater",
    "bear",
    "blue whale",
    "brontosaurus",
    "bug",
    "canal",
    "cat",
    "chicken",
    "chinchilla",
    "coelecanth",
    "dire wolf",
    "dog",
    "doge",
    "donut",
    "dragon",
    "elephant",
    "enchilada",
    "ferret",
    "ghost",
    "godzilla",
    "hug",
    "jellyfish",
    "kangaroo",
    "mammoth",
    "monkey",
    "monster",
    "moose",
    "nuke",
    "opossum",
    "owl",
    "pangolin",
    "penis",
    "pig",
    "platypus",
    "polar bear",
    "pufferfish",
    "puma",
    "saint bernard",
    "skunk",
    "snake",
    "sock",
    "space reptile",
    "sperm whale",
    "sundae",
    "tapir",
    "troll",
    "unicorn",
    "vat",
    "walrus",
    "warthog",
    "weasel",
    "whale",
    "wolf",
    "wolverine",
  ];

  static readonly OneOffs: Array<string> = [
    "My hobbies include splitting wood and giving chili dogs.",
    "Tis better to give than receive chili dogs!",
    "_reads the latest chilizoological report_",
  ];

  static readonly Sides: Array<string> = [
    "a blue sock",
    "a coco dongle",
    "cold semen",
    "mayo",
    "muppet sauce",
    "mustard",
    "a pink sock",
    "a red sock",
  ];

  /**
   * Floods the user with chili
   * @param user_id - User ID of chili recipient
   * @returns Recipient's chili gift
   */
  static chilify(user_id: string): string {
    const appetizer = `gives ${normalizeUserId(user_id)}`;

    let entree = `chili ${selectFrom(Ryecock.DeliveryDevices) || 'dog'}`;
    if (Math.random() < 0.5) {
      const adj = selectFrom(Ryecock.Adjectives);
      if (adj) entree = `${adj} ${entree}`;
    }
    entree = `${articleFor(entree)} ${entree}`;

    if (Math.random() < 0.2) {
      const side = selectFrom(Ryecock.Sides);
      if (side) entree = `${entree} with ${side}`;
    }

    return `_${appetizer} ${entree}_`;
  }

  /**
   * Invokes the chili monstor, targeting a user if available
   * @param [user_id] - User ID of user to flood
   * @returns The resulting chili concoction
   */
  static flood(user_id: string): string {
    if (!user_id || Math.random() < 0.01) {
      const reply = selectFrom(Ryecock.OneOffs);
      if (reply) return reply;
    }

    return Ryecock.chilify(user_id);
  }

  /**
   * Instance properties and methods
   */

  app: App;
  registry: Registry;

  constructor(registry: Registry) {
    this.app = registry.app;
    this.registry = registry;
  }

  /**
   * Periodically floods all members of the given channel
   * @param channelName - name of the channel to flood at intervals
   * @param delay - minimum time (in hours) to wait between floods
   * @param span - maximum period of time (in hours) before next flood
   */
  async autoFlood(channelName: string, delay = 2, span = 12) {
    const hour = 3600000;
    const randomTimeout = () => delay * hour + Math.random() * (span * hour);

    // fetch channel list
    const { channels } = await this.app.client.conversations.list();
    // find channel id by name
    const chan_id = channels?.find((ch) => ch.name === channelName)?.id;

    if (!chan_id) return;

    const callback = () => {
      this.floodChannel(chan_id).finally(() =>
        setTimeout(callback, randomTimeout())
      );
    };

    setTimeout(callback, randomTimeout());
  }

  /**
   * Floods all members of a channel with chili
   * @param channel - The channel ID of the channel to flood
   */
  async floodChannel(channel: string) {
    console.log(`Flooding ${channel} ...`);
    // destruct api calls
    const { auth, chat, conversations } = this.app.client;
    const { members } = await conversations.members({ channel });

    if (members) {
      const { user_id: my_id } = await auth.test();
      await Promise.all(
        members
          .filter((uid) => uid !== my_id)
          .map((user) =>
            chat.postMessage({ channel, text: Ryecock.flood(user) })
          )
      );
    }
  }
}

export const init: PluginInit = (reg) => {
  const ryecock = new Ryecock(reg);

  reg.command('/chilify', async ({ack, command, say}) => {
    const [recipient] = command.text.split(/\s+/, 2);

    await Promise.all([
      ack(),
      say(Ryecock.chilify(recipient || command.user_id)),
    ]);
  });

  reg.command('/flood', async ({ack, command }) => {
    await Promise.all([ack(), ryecock.floodChannel(command.channel_id)]);
  });

  reg.mention(async ({ payload, say }) => {
    if (payload.text && payload.user) {
      if (payload.text.match(/\bchili\b/i)) {
        await say(Ryecock.flood(payload.user));
      }
    }
  });

  reg.message(async ({ payload, say }) => {
    console.log('MESSAGE', payload);

    if (payload.subtype || !payload.text) return;

    const { text, user } = payload;
    if (user && text.match(/\bchili\b/i)) {
      await say(Ryecock.flood(payload.user));
    }
  });

  ryecock.autoFlood('general').catch((err) => {
    console.error(`Can't flood channel`, err);
  });
};

export default init;
