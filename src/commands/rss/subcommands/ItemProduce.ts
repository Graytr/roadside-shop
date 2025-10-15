import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { ProductionService } from '../../../services/ProductionService.js';

export class ItemProduce implements Subcommand {
    name = 'item-produce';
    description = 'Record that you produced items for the guild (credits custody to you).';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        const item = interaction.options.getString('item', true);
        const qty = interaction.options.getInteger('qty', true);
        const note = interaction.options.getString('note', false) ?? undefined;

        try {
            await ProductionService.produce(interaction.guildId, item, interaction.user.id, qty, note);
            await interaction.reply({
                content: `🧰 Added **${qty}× ${item}** to your guild-held custody.${note ? ` Note: _${note}_` : ''}`,
                ephemeral: true
            });
        } catch (e: any) {
            await interaction.reply({ content: `❌ ${e.message ?? 'Failed to record production.'}`, ephemeral: true });
        }
    }
}
