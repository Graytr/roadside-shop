import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

// Build a single /rss with subcommands + groups
const commands = [
    new SlashCommandBuilder()
        .setName('rss')
        .setDescription('Roadside Shop')
        // top-level subcommands (everyone)
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
        // wallet group: show (all), deposit (admin)
        .addSubcommandGroup(g => g
            .setName('wallet')
            .setDescription('Wallet commands')
            .addSubcommand(sc => sc
                .setName('show')
                .setDescription('Show your wallet')))
        // deposit lives in the same group; still referenced as /rss wallet deposit
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
        // materials admin
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
        // product admin
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
        // setup (admin bootstrap allowed by code)
        .addSubcommand(sc => sc
            .setName('pos-setup')
            .setDescription('Set admin/trader roles for the POS bot')
            .addRoleOption(o => o.setName('admin_role').setDescription('Admins who manage inventory').setRequired(true))
            .addRoleOption(o => o.setName('trader_role').setDescription('Traders who can post shop offers').setRequired(true)))
].map(c => c.toJSON());


const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
    const appId = process.env.DISCORD_APP_ID!;
    if (process.env.GUILD_ID) {
        await rest.put(Routes.applicationGuildCommands(appId, process.env.GUILD_ID), { body: commands });
        console.log('✓ Registered guild commands');
    } else {
        await rest.put(Routes.applicationCommands(appId), { body: commands });
        console.log('✓ Registered global commands');
    }
})();