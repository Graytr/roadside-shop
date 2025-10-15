import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { BemService } from '../../../services/BemService.js';

export class BemCheckin implements Subcommand {
    name = 'bem-checkin';
    description = 'Admin: return BEM units you hold';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const bemId = interaction.options.getString('bem', true);
        const qty = interaction.options.getInteger('qty', true);
        await BemService.checkin(interaction.guildId!, interaction.user.id, bemId, qty);
        await interaction.reply({ content: `✅ Returned **${qty}** of **${bemId}**.`, ephemeral: true });
    }
}
