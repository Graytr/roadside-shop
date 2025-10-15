import { Database } from '../db/Database.js';

export interface Material {
    name: string;
    value: number;
}

export class MaterialsService {
    static async getAll(guildId: string): Promise<Material[]> {
        const db = Database.forGuild(guildId);
        return db.materials.getAll();
    }

    static async set(guildId: string, name: string, value: number): Promise<void> {
        const db = Database.forGuild(guildId);
        await db.materials.upsert(name, { name, value });
    }
}
