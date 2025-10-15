import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { PermissionService } from '../../../services/PermissionService.js';
import { WalletService } from '../../../services/WalletService.js';

export class WalletDeposit implements Subcommand {
    name = 'wallet-deposit';
    description = 'Admin: deposit to a user wallet';

    async execute(interaction: ChatInputCommandInteraction) {
        if (!PermissionService.isAdmin(interaction.member)) {
            await interaction.reply({ content: '❌ Admins only.', ephemeral: true });
            return;
        }
        const user = interaction.options.getUser('user', true);
        const amount = interaction.options.getNumber('amount', true);
        await WalletService.deposit(interaction.guildId!, user.id, amount);
        await interaction.reply({ content: `✅ Deposited **$${amount}** to <@${user.id}>.`, ephemeral: true });
    }
}
