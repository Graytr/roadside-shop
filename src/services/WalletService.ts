import { Database } from '../db/Database.js';

export class WalletService {
    static async getUserBalance(guildId: string, userId: string): Promise<number> {
        const db = Database.forGuild(guildId);
        return (await db.wallets.get(userId)) ?? 0;
    }

    static async deposit(guildId: string, userId: string, amount: number): Promise<void> {
        const db = Database.forGuild(guildId);
        const current = (await db.wallets.get(userId)) ?? 0;
        await db.wallets.upsert(userId, current + amount);
    }
}
