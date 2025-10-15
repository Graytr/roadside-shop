import { Database } from '../db/Database.js';
import type { InventoryItem } from './InventoryService';

export class ProductService {
    static async addProduct(guildId: string, item: InventoryItem): Promise<void> {
        const db = Database.forGuild(guildId);
        await db.inventory.upsert(item.name, item);
    }

    static async setPrice(guildId: string, name: string, price: number): Promise<void> {
        const db = Database.forGuild(guildId);
        const prod = await db.inventory.get(name);
        if (!prod) throw new Error('Product not found');
        prod.price = price;
        await db.inventory.upsert(name, prod);
    }

    static async setStock(guildId: string, name: string, stock: number): Promise<void> {
        const db = Database.forGuild(guildId);
        const prod = await db.inventory.get(name);
        if (!prod) throw new Error('Product not found');
        prod.stock = stock;
        await db.inventory.upsert(name, prod);
    }
}
