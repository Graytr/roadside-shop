import { prisma } from '../db/prisma.js';

export interface InventoryRow {
    name: string;
    total: number;        // sum of all user-held guild stock
    holders: { userId: string; qty: number }[];
    price?: number | null;
}

export class InventoryService {
    static async getInventory(guildId: string): Promise<InventoryRow[]> {
        const items = await prisma.item.findMany({ where: { guildId } });
        const custody = await prisma.itemCustody.findMany({ where: { guildId } });

        const byItem = new Map<string, { total: number; holders: { userId: string; qty: number }[] }>();
        for (const c of custody) {
            const bucket = byItem.get(c.item) ?? { total: 0, holders: [] };
            bucket.total += c.qty;
            if (c.qty > 0) bucket.holders.push({ userId: c.userId, qty: c.qty });
            byItem.set(c.item, bucket);
        }

        return items.map(i => {
            const bucket = byItem.get(i.name) ?? { total: 0, holders: [] };
            return { name: i.name, total: bucket.total, holders: bucket.holders, price: i.price ?? null };
        });
    }
}
