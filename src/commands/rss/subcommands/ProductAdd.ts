import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { ProductService } from '../../../services/ProductService.js';

export class ProductAdd implements Subcommand {
    name = 'product-add';
    description = 'Admin: add a product';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const name = interaction.options.getString('name', true);
        const price = interaction.options.getNumber('price', true);
        const stock = interaction.options.getInteger('stock', true);

        await ProductService.addProduct(interaction.guildId!, { name, price, stock });
        await interaction.reply({ content: `✅ Added **${name}** at $${price} (x${stock}).`, ephemeral: true });
    }
}
