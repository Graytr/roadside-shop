import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const dbg = {
    hasEnvFile: fs.existsSync(path.resolve(process.cwd(), '.env')),
    appId: process.env.DISCORD_APP_ID,
    guildId: process.env.GUILD_ID,
    tokenStartsWith: process.env.DISCORD_TOKEN?.slice(0, 8),
};
console.log('[deploy-commands] env check:', dbg);

const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID!;
const guildId = process.env.GUILD_ID;

if (!token) throw new Error('Missing DISCORD_TOKEN in .env');
if (!appId) throw new Error('Missing DISCORD_APP_ID in .env');

const commands = [
    new SlashCommandBuilder()
        .setName('rss')
        .setDescription('Roadside Shop')

        // Everyone
        .addSubcommand(sc => sc
            .setName('shop')
            .setDescription('Post a shop offer (buyers request; admins fulfill)')
            .addStringOption(o => o
                .setName('sku')
                .setDescription('product sku')
                .setRequired(true)
                .setAutocomplete(true))
            .addIntegerOption(o => o
                .setName('qty')
                .setDescription('quantity to offer in this post')
                .setRequired(true))
            .addChannelOption(o => o
                .setName('channel')
                .setDescription('target channel')
                .setRequired(false)))
        .addSubcommand(sc => sc
            .setName('list')
            .setDescription('Show product inventory')
            .addBooleanOption(o => o
                .setName('in_stock_only')
                .setDescription('Show only items with stock')
                .setRequired(false))
            .addIntegerOption(o => o
                .setName('page')
                .setDescription('Page number (1-based)')
                .setRequired(false)))

        // Wallet (user + admin group)
        .addSubcommandGroup(g => g
            .setName('wallet')
            .setDescription('Wallet commands')
            .addSubcommand(sc => sc
                .setName('show')
                .setDescription('Show your wallet')))
        .addSubcommandGroup(g => g
            .setName('wallet_admin')
            .setDescription('Admin wallet commands')
            .addSubcommand(sc => sc
                .setName('deposit')
                .setDescription('Deposit materials to a user wallet')
                .addUserOption(o => o.setName('user').setDescription('target user').setRequired(true))
                .addIntegerOption(o => o.setName('bolts').setDescription('qty').setRequired(true))
                .addIntegerOption(o => o.setName('duct_tape').setDescription('qty').setRequired(true))
                .addIntegerOption(o => o.setName('planks').setDescription('qty').setRequired(true))))

        // Materials (admin)
        .addSubcommandGroup(g => g
            .setName('materials')
            .setDescription('Guild materials (admin)')
            .addSubcommand(sc => sc.setName('show').setDescription('Show guild materials'))
            .addSubcommand(sc => sc
                .setName('set')
                .setDescription('Set guild materials')
                .addIntegerOption(o => o.setName('bolts').setDescription('qty').setRequired(true))
                .addIntegerOption(o => o.setName('duct_tape').setDescription('qty').setRequired(true))
                .addIntegerOption(o => o.setName('planks').setDescription('qty').setRequired(true))))

        // Product (admin)
        .addSubcommandGroup(g => g
            .setName('product')
            .setDescription('Product management (admin)')
            .addSubcommand(sc => sc
                .setName('add')
                .setDescription('Add a product')
                .addStringOption(o => o.setName('name').setDescription('e.g., Carrot Pie').setRequired(true))
                .addStringOption(o => o.setName('sku').setDescription('unique id').setRequired(true))
                .addIntegerOption(o => o.setName('price_bems').setDescription('price in BEMs').setRequired(true))
                .addIntegerOption(o => o.setName('stock_qty').setDescription('starting stock').setRequired(true)))
            .addSubcommand(sc => sc
                .setName('setprice')
                .setDescription('Update a product price')
                .addStringOption(o => o.setName('sku').setDescription('product sku').setRequired(true))
                .addIntegerOption(o => o.setName('price_bems').setDescription('new price in BEMs').setRequired(true)))
            .addSubcommand(sc => sc
                .setName('stock')
                .setDescription('Set product stock qty')
                .addStringOption(o => o.setName('sku').setDescription('product sku').setRequired(true))
                .addIntegerOption(o => o.setName('qty').setDescription('new stock').setRequired(true))))

        // Setup (admin bootstrap handled in code too)
        .addSubcommand(sc => sc
            .setName('pos-setup')
            .setDescription('Set admin/trader roles for the POS bot')
            .addRoleOption(o => o.setName('admin_role').setDescription('Admins who manage inventory').setRequired(true))
            .addRoleOption(o => o.setName('trader_role').setDescription('Traders who can post shop offers').setRequired(true)))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    if (guildId) {
        await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
        console.log('✓ Registered guild commands for /rss');
    } else {
        await rest.put(Routes.applicationCommands(appId), { body: commands });
        console.log('✓ Registered global commands for /rss (may take a while to appear)');
    }
})();
