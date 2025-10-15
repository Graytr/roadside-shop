import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { MaterialsService } from '../../../services/MaterialsService.js';

export class MaterialsSet implements Subcommand {
    name = 'materials-set';
    description = 'Admin: set a material value';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const material = interaction.options.getString('material', true);
        const value = interaction.options.getNumber('value', true);
        await MaterialsService.set(interaction.guildId!, material, value);
        await interaction.reply({ content: `✅ Set **${material}** to **${value}**.`, ephemeral: true });
    }
}
