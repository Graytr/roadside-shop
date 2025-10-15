import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { ItemCustodyService } from '../../../services/ItemCustodyService.js';

export class MyItems implements Subcommand {
    name = 'my-items';
    description = 'Show the items you currently hold for the guild.';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        const mine = await ItemCustodyService.myHoldings(interaction.guildId, interaction.user.id);
        if (!mine.length || mine.every(m => m.qty <= 0)) {
            await interaction.reply({ content: 'You are not holding any guild-owned items.', ephemeral: true });
            return;
        }

        const lines = mine
            .filter(m => m.qty > 0)
            .map(m => `• **${m.item}** × ${m.qty} (since <t:${Math.floor(Number(m.ts)/1000)}:R>)`);

        await interaction.reply({
            content: `**Your holdings**\n${lines.join('\n')}`,
            ephemeral: true
        });
    }
}
