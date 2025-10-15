import 'dotenv/config';
import { Bot } from './bot/Bot.js';
import { Registry } from './framework/Registry.js';
import { RssCommand } from './commands/rss/RssCommand.js';

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID; // optional for guild-scoped deploys

if (!token || !clientId) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.');
    process.exit(1);
}

const bot = new Bot({ token });

const registry = new Registry({ clientId, guildId });
registry.register(new RssCommand());

const arg = process.argv[2];
if (arg === '--deploy') {
    // one-off command registration
    registry.deploy().then(() => {
        console.log('Slash commands deployed.');
        process.exit(0);
    }).catch((err: any) => {
        console.error('Failed to deploy commands:', err);
        process.exit(1);
    });
} else {
    bot.start(registry);
}
