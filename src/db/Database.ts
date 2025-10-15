import { prisma } from './prisma.js';

/** Small typed helpers matching the service expectations */
type InventoryItem = { name: string; price: number; stock: number };
type Material = { name: string; value: number };

function cents(n: number): number {
    return Math.round(n * 100);
}
function dollars(c: number | null | undefined): number {
    return ((c ?? 0) / 100);
}

export class Database {
    static forGuild(guildId: string) {
        const gid = guildId;

        return {
            inventory: {
                async getAll(): Promise<InventoryItem[]> {
                    const rows = await prisma.inventory.findMany({ where: { guildId: gid } });
                    return rows.map(r => ({ name: r.name, price: r.price, stock: r.stock }));
                },
                async get(name: string): Promise<InventoryItem | undefined> {
                    const row = await prisma.inventory.findUnique({
                        where: { guildId_name: { guildId: gid, name } }
                    });
                    return row ? { name: row.name, price: row.price, stock: row.stock } : undefined;
                },
                async upsert(name: string, value: InventoryItem): Promise<void> {
                    await prisma.inventory.upsert({
                        where: { guildId_name: { guildId: gid, name } },
                        update: { price: value.price, stock: value.stock },
                        create: { guildId: gid, name, price: value.price, stock: value.stock }
                    });
                }
            },

            materials: {
                async getAll(): Promise<Material[]> {
                    const rows = await prisma.material.findMany({ where: { guildId: gid } });
                    return rows.map(r => ({ name: r.name, value: r.value }));
                },
                async upsert(name: string, value: Material): Promise<void> {
                    await prisma.material.upsert({
                        where: { guildId_name: { guildId: gid, name } },
                        update: { value: value.value },
                        create: { guildId: gid, name, value: value.value }
                    });
                }
            },

            wallets: {
                async get(userId: string): Promise<number | undefined> {
                    const row = await prisma.wallet.findUnique({
                        where: { guildId_userId: { guildId: gid, userId } }
                    });
                    if (!row) return undefined;
                    return dollars(row.cents);
                },
                async upsert(userId: string, balance: number): Promise<void> {
                    await prisma.wallet.upsert({
                        where: { guildId_userId: { guildId: gid, userId } },
                        update: { cents: cents(balance) },
                        create: { guildId: gid, userId, cents: cents(balance) }
                    });
                }
            },

            bems: {
                async getAll() {
                    return prisma.bem.findMany({ where: { guildId: gid } });
                },
                async get(id: string) {
                    return prisma.bem.findUnique({ where: { guildId_id: { guildId: gid, id } } });
                },
                async upsert(id: string, value: { id: string; label: string; qty: number }) {
                    await prisma.bem.upsert({
                        where: { guildId_id: { guildId: gid, id } },
                        update: { label: value.label, qty: value.qty },
                        create: { guildId: gid, id: value.id, label: value.label, qty: value.qty }
                    });
                }
            },

            bemCustody: {
                async getAll() {
                    return prisma.bemCustody.findMany({ where: { guildId: gid } });
                },
                async get(key: string) {
                    const [bemId, userId] = key.split(':');
                    return prisma.bemCustody.findUnique({
                        where: { guildId_bemId_userId: { guildId: gid, bemId, userId } }
                    });
                },
                async upsert(key: string, value: { bemId: string; userId: string; qty: number; ts: number }) {
                    const { bemId, userId, qty, ts } = value;
                    await prisma.bemCustody.upsert({
                        where: { guildId_bemId_userId: { guildId: gid, bemId, userId } },
                        update: { qty, ts: BigInt(ts) },
                        create: { guildId: gid, bemId, userId, qty, ts: BigInt(ts) }
                    });
                }
            }
        };
    }
}
