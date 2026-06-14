import { ActivityType, type Client } from "discord.js";
import { BOT_NAME, EMOJIS } from "../config.js";

const activities = [
  { name: "the cosmos ✨", type: ActivityType.Watching },
  { name: "stellar commands", type: ActivityType.Listening },
  { name: "with stardust", type: ActivityType.Playing },
  { name: "over your server", type: ActivityType.Watching },
];

let activityIndex = 0;

export default {
  name: "ready",
  once: true,
  async execute(client: Client) {
    console.log(`${EMOJIS.STAR} ${BOT_NAME} is online! Logged in as ${client.user?.tag}`);
    console.log(`${EMOJIS.SPARKLE} Serving ${client.guilds.cache.size} guild(s)`);

    const setActivity = () => {
      const activity = activities[activityIndex % activities.length]!;
      client.user?.setPresence({
        activities: [{ name: activity.name, type: activity.type }],
        status: "online",
      });
      activityIndex++;
    };

    setActivity();
    setInterval(setActivity, 30_000);
  },
};
