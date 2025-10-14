import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const commands = [
    new SlashCommandBuilder()
        .setName('pos-setup')
        .setDescription('Set admin/trader roles for the POS bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // ← add this
        .addRoleOption(o => o.setName('admin_role').setDescription('Admins who manage inventory').setRequired(true))
        .addRoleOption(o => o.setName('trader_role').setDescription('Traders who can post shop offers').setRequired(true)),

    new SlashCommandBuilder()
        .setName('catalog')
        .setDescription('Browse product inventory with prices')
        .addSubcommand(sc => sc
            .setName('list')
            .setDescription('Show products with prices and stock')
            .addBooleanOption(o => o
                .setName('in_stock_only')
                .setDescription('Show only items with stock')
                .setRequired(false))
            .addIntegerOption(o => o
                .setName('page')
                .setDescription('Page number (1-based)')
                .setRequired(false))),

    new SlashCommandBuilder()
        .setName('materials')
        .setDescription('View or set guild materials (Bolts, Duct Tape, Planks)')
        .addSubcommand(sc=>sc.setName('show').setDescription('Show guild materials'))
        .addSubcommand(sc=>sc.setName('set').setDescription('Set materials (admin only)')
            .addIntegerOption(o=>o.setName('bolts').setDescription('qty').setRequired(true))
            .addIntegerOption(o=>o.setName('duct_tape').setDescription('qty').setRequired(true))
            .addIntegerOption(o=>o.setName('planks').setDescription('qty').setRequired(true))),

    new SlashCommandBuilder()
        .setName('product')
        .setDescription('Manage food/products and pricing in materials')
        .addSubcommand(sc=>sc.setName('add').setDescription('Add a product')
            .addStringOption(o=>o.setName('name').setDescription('e.g., Carrot Pie').setRequired(true))
            .addStringOption(o=>o.setName('sku').setDescription('unique id').setRequired(true))
            .addIntegerOption(o=>o.setName('priceBems').setDescription('price in BEMs').setRequired(true))
            .addIntegerOption(o=>o.setName('stock_qty').setDescription('starting stock').setRequired(true)))
        .addSubcommand(sc=>sc.setName('setprice').setDescription('Update a product price')
            .addStringOption(o=>o.setName('sku').setDescription('product sku').setRequired(true))
            .addIntegerOption(o=>o.setName('priceBems').setDescription('BEMs').setRequired(true)))
        .addSubcommand(sc=>sc.setName('stock').setDescription('Set product stock qty')
            .addStringOption(o=>o.setName('sku').setDescription('product sku').setRequired(true))
            .addIntegerOption(o=>o.setName('qty').setDescription('new stock').setRequired(true))),

    new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('Manage a user wallet of materials')
        .addSubcommand(sc=>sc.setName('deposit').setDescription('Deposit materials to a user wallet')
            .addUserOption(o=>o.setName('user').setDescription('target user').setRequired(true))
            .addIntegerOption(o=>o.setName('bolts').setDescription('qty').setRequired(true))
            .addIntegerOption(o=>o.setName('duct_tape').setDescription('qty').setRequired(true))
            .addIntegerOption(o=>o.setName('planks').setDescription('qty').setRequired(true)))
        .addSubcommand(sc=>sc.setName('show').setDescription('Show a user wallet')
            .addUserOption(o=>o.setName('user').setDescription('target user').setRequired(false))),

    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Post a shop offer message with Buy buttons (for traders)')
        .addStringOption(o=>o.setName('sku').setDescription('product sku').setRequired(true))
        .addIntegerOption(o=>o.setName('qty').setDescription('quantity to sell in this post').setRequired(true))
        .addChannelOption(o=>o.setName('channel').setDescription('target channel').setRequired(false)),
].map(c=>c.toJSON());

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