import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { BemService } from '../../../services/BemService.js';

export class BemCheckout implements Subcommand {
    name = 'bem-checkout';
    description = 'Admin: check out BEM units to yourself';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const bemId = interaction.options.getString('bem', true);
        const qty = interaction.options.getInteger('qty', true);
        await BemService.checkout(interaction.guildId!, interaction.user.id, bemId, qty);
        await interaction.reply({ content: `✅ Checked out **${qty}** of **${bemId}** to you.`, ephemeral: true });
    }
}
