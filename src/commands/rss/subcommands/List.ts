import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { InventoryService } from '../../../services/InventoryService.js';

export class List implements Subcommand {
    name = 'list';
    description = 'Show current inventory for the guild';

    async execute(interaction: ChatInputCommandInteraction) {
        const items = await InventoryService.getInventory(interaction.guildId!);
        if (!items.length) {
            await interaction.reply({ content: '📦 Inventory is empty.', ephemeral: true });
            return;
        }

        const lines = items.map(i => `• **${i.name}** — $${i.price.toFixed(2)} (x${i.stock})`);
        await interaction.reply({ content: `**Inventory**\n${lines.join('\n')}`, ephemeral: true });
    }
}
