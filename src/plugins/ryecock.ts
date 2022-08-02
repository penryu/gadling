import { App } from '@slack/bolt';
import * as db from 'zapatos/db';
import type * as s from 'zapatos/schema';

import { getPool } from '../db';
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
const FLOOD_INTERVAL = 3 * Duration.DAY;

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
    "colorado",
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
    "My hobbies include splitting wood and serving chili dogs.",
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
  static serve(user_id: string): string {
    const user = normalizeUserId(user_id);

    const selection = selectFrom(Ryecock.DeliveryDevices);
    if (selection.some) {
      const appetizer = `gives ${user}`;

      let entree = `chili ${selection.value}`;
      if (Math.random() < 0.5) {
        const adj = selectFrom(Ryecock.Adjectives);
        if (adj.some) entree = `${adj.value} ${entree}`;
      }
      entree = `${articleFor(entree)} ${entree}`;

      if (Math.random() < 0.2) {
        const side = selectFrom(Ryecock.Sides);
        if (side.some) entree = `${entree} with ${side.value}`;
      }

      return `_${appetizer} ${entree}_`;
    }

    return "I appear to be out of chili, ${user}.";
  }

  /**
   * Invokes the chili monstor, targeting a user if available
   * @param [user_id] - User ID of user to flood
   * @returns The resulting chili concoction
   */
  static flood(user_id: string): string {
    if (!user_id || Math.random() < 0.01) {
      const reply = selectFrom(Ryecock.OneOffs);
      if (reply.some) return reply.value;
    }

    return Ryecock.serve(user_id);
  }

  /**
   * Instance properties and methods
   */

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

    await db.sql<s.almanac.SQL, s.almanac.Insertable>`
      INSERT INTO ${'almanac'} (${'recipient'})
        VALUES (${db.param(chan_id)})
      ON CONFLICT (${'recipient'}) DO NOTHING
    `.run(getPool());

    const randomTimeout = () =>
      FLOOD_POLL_INTERVAL + Math.random() * Duration.MINUTE;

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
    log.info(`Attempting to flood ${channel} ...`);

    const [record] = await db.sql<s.almanac.SQL, s.almanac.Selectable[]>`
      SELECT ${'served_at'}
      FROM ${'almanac'}
      WHERE ${'recipient'} = ${db.param(channel)}
    `.run(getPool());

    if (!record) throw new Error(`no record of flooding ${channel}!`);
    const { served_at: floodTime } = record;

    floodTime.setUTCMilliseconds(
      floodTime.getUTCMilliseconds() + FLOOD_INTERVAL
    );
    const now = new Date();
    if (floodTime > now) {
      log.info("... flood averted");
      return;
    }

    log.warn("... flood incoming!");

    // update flood time in database
    await db.sql<s.almanac.SQL, s.almanac.Updatable>`
      UPDATE ${'almanac'}
      SET served_at = NOW()
    `.run(getPool());

    // destructure api calls
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

export const init: PluginInit = (pm) => {
  const ryecock = new Ryecock(pm);

  pm.command(
    "serve",
    [
      "Ensures the recipient receives the US RDA of chili",
      "`!serve @guest`",
    ],
    async ({ rest, user }, { say }) => {
      if (!rest.some) return;

      const [recipient] = rest.value.split(/\s+/, 2);

      await say(Ryecock.serve(recipient || user));
    }
  );

  pm.command(
    "flood",
    ["Flood the channel with chili", "`!flood`"],
    async ({ channel }) => {
      await ryecock.floodChannel(channel);
    }
  );

  pm.message(
    ["Mention `chili` and ye shall receive"],
    async ({ payload, say }) => {
      if (payload.subtype || !payload.text) return;

      const { text, user } = payload;
      if (user && text.match(/\bchili\b/i)) {
        await say(Ryecock.flood(payload.user));
      }
    }
  );

  ryecock.autoFlood('general').catch((err) => {
    log.error("Can't flood channel: %s", err);
  });
};

export default init;
