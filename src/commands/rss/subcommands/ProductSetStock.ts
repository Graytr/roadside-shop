import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { ProductService } from '../../../services/ProductService.js';

export class ProductSetStock implements Subcommand {
    name = 'product-setstock';
    description = 'Admin: set product stock';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const name = interaction.options.getString('name', true);
        const stock = interaction.options.getInteger('stock', true);
        await ProductService.setStock(interaction.guildId!, name, stock);
        await interaction.reply({ content: `✅ Updated **${name}** stock to x${stock}.`, ephemeral: true });
    }
}
