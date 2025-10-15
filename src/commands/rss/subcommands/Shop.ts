import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';

export class Shop implements Subcommand {
    name = 'shop';
    description = 'Open the Roadside Shop UI/link';

    async execute(interaction: ChatInputCommandInteraction) {
        // Replace with your real UI URL or ephemeral message
        await interaction.reply({
            content: '🛒 Roadside Shop is live! Use `/rss list` to browse, or visit the dashboard (coming soon).',
            ephemeral: true
        });
    }
}
