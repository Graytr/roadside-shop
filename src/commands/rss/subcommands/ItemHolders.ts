import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { ItemCustodyService } from '../../../services/ItemCustodyService.js';

export class ItemHolders implements Subcommand {
    name = 'item-holders';
    description = 'See who currently holds an item (guild-owned custody).';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        const item = interaction.options.getString('item', true);
        const rows = await ItemCustodyService.whoHolds(interaction.guildId, item);

        if (!rows.length || rows.every(r => r.qty <= 0)) {
            await interaction.reply({ content: `No one currently holds **${item}**.`, ephemeral: true });
            return;
        }

        const lines = rows
            .filter(r => r.qty > 0)
            .map(r => `• <@${r.userId}> — **${r.qty}×** (since <t:${Math.floor(Number(r.ts)/1000)}:R>)`);

        await interaction.reply({
            content: `**Holders of ${item}**\n${lines.join('\n')}`,
            ephemeral: true
        });
    }
}
