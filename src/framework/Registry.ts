import {
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChatInputCommandInteraction
} from 'discord.js';
import type { CommandLike } from './types.js';

export class Registry {
    private commands = new Map<string, CommandLike>();
    private clientId: string;
    private guildId?: string;

    constructor(opts: { clientId: string; guildId?: string }) {
        this.clientId = opts.clientId;
        this.guildId = opts.guildId;
    }

    register(cmd: CommandLike) {
        const name = (cmd.data() as any).name;
        this.commands.set(name, cmd);
    }

    async deploy() {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

        const bodies = Array.from(this.commands.values()).map((cmd) => cmd.data().toJSON());

        if (this.guildId) {
            await rest.put(Routes.applicationGuildCommands(this.clientId, this.guildId), { body: bodies });
        } else {
            await rest.put(Routes.applicationCommands(this.clientId), { body: bodies });
        }
    }

    async route(interaction: ChatInputCommandInteraction) {
        const name = interaction.commandName;
        const cmd = this.commands.get(name);
        if (!cmd) throw new Error(`No command registered for /${name}`);
        await cmd.execute(interaction);
    }
}

/**
 * Helper to build the `/rss` with proper default member permissions at the COMMAND level.
 * Subcommands don't support distinct default perms, so admin-only checks are handled at runtime.
 */
export function buildRssBuilder(): SlashCommandBuilder {
    return new SlashCommandBuilder()
        .setName('rss')
        .setDescription('Roadside Shop commands')
        // Only admins (ManageGuild) can see/use the command by default; you can loosen this if needed.
        // If you want everyone to see /rss, remove this line and enforce at runtime per subcommand.
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
}
