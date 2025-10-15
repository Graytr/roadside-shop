import type {
    ChatInputCommandInteraction,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';

export interface Executable {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface Subcommand extends Executable {
    name: string;
    description: string;
}

export interface CommandLike {
    data(): SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
