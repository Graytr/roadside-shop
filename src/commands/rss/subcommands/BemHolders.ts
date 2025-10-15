import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { BemService } from '../../../services/BemService.js';

export class BemHolders implements Subcommand {
    name = 'bem-holders';
    description = 'Admin: list who is holding which BEMs';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const rows = await BemService.holders(interaction.guildId!);
        if (!rows.length) {
            await interaction.reply({ content: 'No BEMs are currently checked out.', ephemeral: true });
            return;
        }
        const lines = rows
            .filter(r => r.qty > 0)
            .map(r => `• <@${r.userId}> holds **${r.qty}** of **${r.bemId}** (since <t:${Math.floor(r.ts/1000)}:R>)`);
        await interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }
}
