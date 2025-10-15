import { Database } from '../db/Database.js';

export interface InventoryItem {
    name: string;
    price: number;
    stock: number;
}

export class InventoryService {
    static async getInventory(guildId: string): Promise<InventoryItem[]> {
        const db = Database.forGuild(guildId);
        return db.inventory.getAll();
    }
}
