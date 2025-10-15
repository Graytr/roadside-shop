import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { ProductionService } from '../../../services/ProductionService.js';

export class ItemConsume implements Subcommand {
    name = 'item-consume';
    description = 'Reduce your custody (e.g., sold, used, or delivered).';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        const item = interaction.options.getString('item', true);
        const qty = interaction.options.getInteger('qty', true);
        const reason = interaction.options.getString('reason') ?? undefined;

        try {
            await ProductionService.consume(interaction.guildId, item, interaction.user.id, qty, reason);
            await interaction.reply({
                content: `🗃️ Removed **${qty}× ${item}** from your custody.${reason ? ` Reason: _${reason}_` : ''}`,
                ephemeral: true
            });
        } catch (e: any) {
            await interaction.reply({ content: `❌ ${e.message ?? 'Failed to reduce custody.'}`, ephemeral: true });
        }
    }
}
