import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { MaterialsService } from '../../../services/MaterialsService.js';

export class MaterialsShow implements Subcommand {
    name = 'materials-show';
    description = 'Admin: show materials table';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const materials = await MaterialsService.getAll(interaction.guildId!);
        const lines = materials.map(m => `• **${m.name}**: ${m.value}`);
        await interaction.reply({
            content: lines.length ? `**Materials**\n${lines.join('\n')}` : 'No materials configured.',
            ephemeral: true
        });
    }
}
