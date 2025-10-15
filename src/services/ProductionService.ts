import { prisma } from '../db/prisma.js';
import { ItemCustodyService } from './ItemCustodyService.js';

export class ProductionService {
    static async produce(guildId: string, item: string, userId: string, qty: number, note?: string) {
        if (qty <= 0) throw new Error('qty must be > 0');
        await prisma.$transaction(async (tx) => {
            // ensure catalog row exists (optional convenience)
            await tx.item.upsert({
                where: { guildId_name: { guildId, name: item } },
                update: {},
                create: { guildId, name: item }
            });
            await tx.productionLog.create({
                data: { guildId, item, userId, qty, ts: BigInt(Date.now()), note }
            });
        });
        // credit custody to the producer
        await ItemCustodyService.addToUser(guildId, item, userId, qty);
    }

    static async consume(guildId: string, item: string, userId: string, qty: number, reason?: string) {
        if (qty <= 0) throw new Error('qty must be > 0');
        await prisma.$transaction(async (tx) => {
            // deduct custody
            const key = { guildId_item_userId: { guildId, item, userId } };
            const existing = await tx.itemCustody.findUnique({ where: key });
            if (!existing || existing.qty < qty) throw new Error('insufficient holdings');
            await tx.itemCustody.update({
                where: key,
                data: { qty: existing.qty - qty, ts: BigInt(Date.now()) }
            });
            // audit
            await tx.consumptionLog.create({
                data: { guildId, item, userId, qty, reason, ts: BigInt(Date.now()) }
            });
        });
    }
}
