import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from '../../../framework/types.js';
import { WalletService } from '../../../services/WalletService.js';

export class Wallet implements Subcommand {
    name = 'wallet';
    description = 'Show your wallet balance';

    async execute(interaction: ChatInputCommandInteraction) {
        const bal = await WalletService.getUserBalance(interaction.guildId!, interaction.user.id);
        await interaction.reply({ content: `👛 Your balance: **$${bal.toFixed(2)}**`, ephemeral: true });
    }
}
