import {
    Client,
    GatewayIntentBits,
    Partials,
    Interaction
} from 'discord.js';
import type { Registry } from '../framework/Registry.js';

export class Bot {
    private client: Client;
    private token: string;

    constructor(opts: { token: string }) {
        this.token = opts.token;
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds],
            partials: [Partials.GuildMember]
        });
    }

    start(registry: Registry) {
        this.client.once('ready', (c) => {
            console.log(`Logged in as ${c.user.tag}`);
        });

        this.client.on('interactionCreate', async (interaction: Interaction) => {
            if (!interaction.isChatInputCommand()) return;
            try {
                await registry.route(interaction);
            } catch (err) {
                console.error('Interaction error:', err);
                if (interaction.isRepliable()) {
                    const content = 'There was an error executing this command.';
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content, ephemeral: true }).catch(() => {});
                    } else {
                        await interaction.reply({ content, ephemeral: true }).catch(() => {});
                    }
                }
            }
        });

        this.client.login(this.token);
    }
}
