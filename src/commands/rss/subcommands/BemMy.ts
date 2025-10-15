import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { BemService } from '../../../services/BemService.js';

export class BemMy implements Subcommand {
    name = 'bem-my';
    description = 'Admin: show BEMs you currently hold';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const mine = await BemService.my(interaction.guildId!, interaction.user.id);
        if (!mine.length || mine.every(m => m.qty <= 0)) {
            await interaction.reply({ content: 'You are not holding any BEMs.', ephemeral: true });
            return;
        }
        const lines = mine.filter(m => m.qty > 0)
            .map(m => `• **${m.bemId}** × ${m.qty} (since <t:${Math.floor(m.ts/1000)}:R>)`);
        await interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }
}
