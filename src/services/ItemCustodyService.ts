import { prisma } from '../db/prisma.js';

export class ItemCustodyService {
    static async addToUser(guildId: string, item: string, userId: string, qty: number) {
        if (qty <= 0) throw new Error('qty must be > 0');
        const key = { guildId_item_userId: { guildId, item, userId } };
        const existing = await prisma.itemCustody.findUnique({ where: key });
        const newQty = (existing?.qty ?? 0) + qty;
        await prisma.itemCustody.upsert({
            where: key,
            update: { qty: newQty, ts: BigInt(Date.now()) },
            create: { guildId, item, userId, qty, ts: BigInt(Date.now()) }
        });
    }

    static async removeFromUser(guildId: string, item: string, userId: string, qty: number) {
        if (qty <= 0) throw new Error('qty must be > 0');
        const key = { guildId_item_userId: { guildId, item, userId } };
        const existing = await prisma.itemCustody.findUnique({ where: key });
        if (!existing || existing.qty < qty) throw new Error('insufficient holdings');
        await prisma.itemCustody.update({
            where: key,
            data: { qty: existing.qty - qty, ts: BigInt(Date.now()) }
        });
    }

    static async transfer(guildId: string, item: string, fromUser: string, toUser: string, qty: number) {
        if (fromUser === toUser) return;
        await prisma.$transaction(async (tx) => {
            const keyFrom = { guildId_item_userId: { guildId, item, userId: fromUser } };
            const from = await tx.itemCustody.findUnique({ where: keyFrom });
            if (!from || from.qty < qty) throw new Error('insufficient holdings to transfer');

            await tx.itemCustody.update({ where: keyFrom, data: { qty: from.qty - qty, ts: BigInt(Date.now()) } });

            const keyTo = { guildId_item_userId: { guildId, item, userId: toUser } };
            const to = await tx.itemCustody.findUnique({ where: keyTo });
            await tx.itemCustody.upsert({
                where: keyTo,
                update: { qty: (to?.qty ?? 0) + qty, ts: BigInt(Date.now()) },
                create: { guildId, item, userId: toUser, qty, ts: BigInt(Date.now()) }
            });

            await tx.transferLog.create({
                data: { guildId, item, fromUser, toUser, qty, ts: BigInt(Date.now()) }
            });
        });
    }

    static async whoHolds(guildId: string, item: string) {
        return prisma.itemCustody.findMany({ where: { guildId, item } });
    }

    static async myHoldings(guildId: string, userId: string) {
        return prisma.itemCustody.findMany({ where: { guildId, userId } });
    }
}
