import type { ChatInputCommandInteraction } from 'discord.js';
import type { Subcommand } from './types.js';

export abstract class CommandBase {
    protected subcommands = new Map<string, Subcommand>();

    registerSubcommand(sc: Subcommand) {
        this.subcommands.set(sc.name, sc);
    }

    protected async executeSub(interaction: ChatInputCommandInteraction) {
        const sub = interaction.options.getSubcommand(false);
        if (!sub) throw new Error('No subcommand provided.');
        const impl = this.subcommands.get(sub);
        if (!impl) throw new Error(`Unknown subcommand: ${sub}`);
        await impl.execute(interaction);
    }
}
