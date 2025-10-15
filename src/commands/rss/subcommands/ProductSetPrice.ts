import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { ProductService } from '../../../services/ProductService.js';

export class ProductSetPrice implements Subcommand {
    name = 'product-setprice';
    description = 'Admin: set product price';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const name = interaction.options.getString('name', true);
        const price = interaction.options.getNumber('price', true);
        await ProductService.setPrice(interaction.guildId!, name, price);
        await interaction.reply({ content: `✅ Updated **${name}** price to $${price}.`, ephemeral: true });
    }
}
