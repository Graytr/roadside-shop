type Table<T> = {
    getAll(): Promise<T[]>;
    get(key: string): Promise<T | undefined>;
    upsert(key: string, value: T): Promise<void>;
};

class MemoryTable<T> implements Table<T> {
    private map = new Map<string, T>();
    async getAll() { return Array.from(this.map.values()); }
    async get(key: string) { return this.map.get(key); }
    async upsert(key: string, value: T) { this.map.set(key, value); }
}

class GuildDB {
    inventory = new MemoryTable<any>();
    materials = new MemoryTable<any>();
    wallets = new MemoryTable<number>();
    // NEW
    bems = new MemoryTable<any>();        // key = bem.id
    bemCustody = new MemoryTable<any>();  // key = `${bemId}:${userId}`
}

const DBS = new Map<string, GuildDB>();

export class Database {
    static forGuild(guildId: string): GuildDB {
        let db = DBS.get(guildId);
        if (!db) {
            db = new GuildDB();
            DBS.set(guildId, db);
        }
        return db;
    }
}
