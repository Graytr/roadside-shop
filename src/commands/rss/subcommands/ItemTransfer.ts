import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { ItemCustodyService } from '../../../services/ItemCustodyService.js';

export class ItemTransfer implements Subcommand {
    name = 'item-transfer';
    description = 'Transfer custody of an item you hold to another member.';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        const item = interaction.options.getString('item', true);
        const toUser = interaction.options.getUser('to', true);
        const qty = interaction.options.getInteger('qty', true);

        try {
            await ItemCustodyService.transfer(interaction.guildId, item, interaction.user.id, toUser.id, qty);
            await interaction.reply({
                content: `🔁 Transferred **${qty}× ${item}** to <@${toUser.id}>.`,
                ephemeral: true
            });
        } catch (e: any) {
            await interaction.reply({ content: `❌ ${e.message ?? 'Transfer failed.'}`, ephemeral: true });
        }
    }
}
