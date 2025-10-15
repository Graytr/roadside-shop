import { Database } from '../db/Database.js';

export interface Bem {
    id: string;           // e.g., "BEM-001"
    label: string;        // human name
    qty: number;          // total units available
}

export interface BemCheckout {
    bemId: string;
    userId: string;       // Discord user id of admin holding it
    qty: number;          // units checked out
    ts: number;           // epoch ms
}

export class BemService {
    static async ensureBem(guildId: string, bem: Bem): Promise<void> {
        const db = Database.forGuild(guildId);
        await db.bems.upsert(bem.id, bem);
    }

    static async listBems(guildId: string): Promise<Bem[]> {
        const db = Database.forGuild(guildId);
        return db.bems.getAll();
    }

    static async holders(guildId: string): Promise<BemCheckout[]> {
        const db = Database.forGuild(guildId);
        return db.bemCustody.getAll();
    }

    static async my(guildId: string, userId: string): Promise<BemCheckout[]> {
        const db = Database.forGuild(guildId);
        const all = await db.bemCustody.getAll();
        return all.filter(c => c.userId === userId && c.qty > 0);
    }

    static async checkout(guildId: string, userId: string, bemId: string, qty: number): Promise<void> {
        if (qty <= 0) throw new Error('qty must be > 0');
        const db = Database.forGuild(guildId);
        const bem = await db.bems.get(bemId);
        if (!bem) throw new Error('BEM not found');

        // Calculate currently checked out total for this BEM
        const out = (await db.bemCustody.getAll()).filter(c => c.bemId === bemId)
            .reduce((n, c) => n + c.qty, 0);

        if (out + qty > bem.qty) throw new Error('Not enough units available');

        const key = `${bemId}:${userId}`;
        const existing = await db.bemCustody.get(key);
        const updated: BemCheckout = {
            bemId, userId, qty: (existing?.qty ?? 0) + qty, ts: Date.now()
        };
        await db.bemCustody.upsert(key, updated);
    }

    static async checkin(guildId: string, userId: string, bemId: string, qty: number): Promise<void> {
        if (qty <= 0) throw new Error('qty must be > 0');
        const db = Database.forGuild(guildId);
        const key = `${bemId}:${userId}`;
        const existing = await db.bemCustody.get(key);
        if (!existing || existing.qty < qty) throw new Error('Return exceeds holdings');

        existing.qty -= qty;
        existing.ts = Date.now();
        await db.bemCustody.upsert(key, existing);
    }
}
