import type { GuildMember } from 'discord.js';

export class PermissionService {
    static isAdmin(member: any): member is GuildMember {
        try {
            const m: GuildMember = member;
            // Adjust to your policy; ManageGuild is a common admin gate
            return m.permissions.has('ManageGuild');
        } catch {
            return false;
        }
    }
}
