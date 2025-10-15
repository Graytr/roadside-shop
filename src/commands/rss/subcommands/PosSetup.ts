import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';

export class PosSetup implements Subcommand {
    name = 'pos-setup';
    description = 'Admin: configure POS for this guild';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        // Do setup...
        await interaction.reply({ content: '✅ POS configured for this guild.', ephemeral: true });
    }
}
