import 'dotenv/config';
import {
    Client, GatewayIntentBits, Partials,
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ChannelType, Interaction, PermissionFlagsBits,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // MessageContent intent NOT required for slash+buttons
    ],
    partials: [Partials.Channel],
});

// ---------- Helpers ----------

const ensureGuild = async (interaction: Interaction) => {
    if (!interaction.inGuild()) return;
    await prisma.guild.upsert({
        where: { id: interaction.guildId! },
        update: {},
        create: {
            id: interaction.guildId!,
            name: interaction.guild!.name,
            invMaterials: { create: {} },
        },
    });
};

const hasElevatedPerms = (interaction: Interaction) => {
    // Allow server owner or members with Admin/ManageGuild to bootstrap
    // ChatInputCommandInteraction has memberPermissions; others may not.
    const memberPerms: any = (interaction as any).memberPermissions ?? null;
    const owner = interaction.guild?.ownerId === interaction.user.id;
    const admin = !!memberPerms?.has?.(PermissionFlagsBits.Administrator);
    const manageGuild = !!memberPerms?.has?.(PermissionFlagsBits.ManageGuild);
    return owner || admin || manageGuild;
};

const isAdmin = async (interaction: Interaction) => {
    if (!interaction.inGuild()) return false;
    const g = await prisma.guild.findUnique({ where: { id: interaction.guildId! } });
    if (!g?.adminRoleId) return hasElevatedPerms(interaction); // bootstrap path
    const hasRole =
        (interaction as any).member?.roles?.cache?.has?.(g.adminRoleId) ?? false;
    return hasRole || hasElevatedPerms(interaction);
};

const isTrader = async (interaction: Interaction) => {
    if (!interaction.inGuild()) return false;
    const g = await prisma.guild.findUnique({ where: { id: interaction.guildId! } });
    if (!g?.traderRoleId) return hasElevatedPerms(interaction); // fallback to elevated if not configured
    const hasRole =
        (interaction as any).member?.roles?.cache?.has?.(g.traderRoleId) ?? false;
    return hasRole || hasElevatedPerms(interaction);
};

const normSKU = (s: string) => s.trim().toUpperCase();

// ---------- Bot Ready ----------

client.once('ready', async () => {
    console.log(`✓ Logged in as ${client.user?.tag}`);
});

// ---------- Interaction Handler ----------

client.on('interactionCreate', async (interaction) => {
    try {
        // Allow all interaction types we handle
        if (
            !interaction.isChatInputCommand() &&
            !interaction.isButton() &&
            !interaction.isModalSubmit() &&
            !interaction.isAutocomplete()
        ) return;

        // Ensure DB guild row exists for guild interactions
        if (interaction.inGuild()) {
            await ensureGuild(interaction);
        }

        // --- Autocomplete for /rss shop sku ---
        if (interaction.isAutocomplete()) {
            try {
                if (interaction.commandName === 'rss') {
                    const sub = interaction.options.getSubcommand(false);
                    if (sub === 'shop') {
                        const focused = interaction.options.getFocused(true);
                        if (focused.name === 'sku') {
                            const q = (focused.value || '').toString().trim();
                            const skuQ = q.toUpperCase();

                            const items = await prisma.product.findMany({
                                where: {
                                    guildId: interaction.guildId!,
                                    isActive: true,
                                    OR: [
                                        { sku: { contains: skuQ } },       // SKUs stored uppercase
                                        { name: { contains: q } },
                                        { name: { contains: q.toUpperCase() } },
                                        { name: { contains: q.toLowerCase() } },
                                    ],
                                },
                                orderBy: { name: 'asc' },
                                take: 25,
                            });

                            await interaction.respond(items.map((p) => ({
                                name: `${p.name} (SKU ${p.sku}) — ${p.priceBems} BEMs · stock ${p.stockQty}`,
                                value: p.sku,
                            })));
                            return;
                        }
                    }
                }
                // default empty
                await interaction.respond([]);
            } catch (e) {
                console.error('autocomplete error:', e);
                try { await interaction.respond([]); } catch {}
            }
            return;
        }

        // --- Slash Commands (all under /rss) ---
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;
            if (commandName !== 'rss') return;

            const group = interaction.options.getSubcommandGroup(false); // may be null
            const sub = interaction.options.getSubcommand(false);        // may be null

            // ---------- Top-level: pos-setup ----------
            if (!group && sub === 'pos-setup') {
                if (!(await isAdmin(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Admin or server owner required.' });
                }
                const adminRole = interaction.options.getRole('admin_role', true);
                const traderRole = interaction.options.getRole('trader_role', true);
                await prisma.guild.update({
                    where: { id: interaction.guildId! },
                    data: { adminRoleId: adminRole.id, traderRoleId: traderRole.id },
                });
                return interaction.reply({
                    ephemeral: true,
                    content: `Configured. Admin: <@&${adminRole.id}> · Trader: <@&${traderRole.id}>`
                });
            }

            // ---------- Top-level: list (inventory browser) ----------
            if (!group && sub === 'list') {
                const inStockOnly = interaction.options.getBoolean('in_stock_only') ?? false;
                const page = Math.max(1, interaction.options.getInteger('page') ?? 1);
                const PAGE = 10;
                const where: any = { guildId: interaction.guildId!, isActive: true };
                if (inStockOnly) where.stockQty = { gt: 0 };

                const [items, total] = await Promise.all([
                    prisma.product.findMany({
                        where,
                        orderBy: { name: 'asc' },
                        skip: (page - 1) * PAGE,
                        take: PAGE,
                    }),
                    prisma.product.count({ where }),
                ]);
                if (!items.length) {
                    return interaction.reply({ ephemeral: true, content: 'No products to show.' });
                }
                const lines = items.map((p) =>
                    `• **${p.name}** (SKU: ${p.sku}) — **${p.priceBems} BEMs** · Stock: **${p.stockQty}**`
                );
                const embed = new EmbedBuilder()
                    .setTitle('📦 Product Catalog')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `Page ${page} of ${Math.max(1, Math.ceil(total / PAGE))} • ${inStockOnly ? 'In-stock only' : 'All active'}` });
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // ---------- Top-level: shop (post offer) ----------
            if (!group && sub === 'shop') {
                if (!(await isTrader(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Trader/Admin required.' });
                }
                const sku = normSKU(interaction.options.getString('sku', true));
                const qty = interaction.options.getInteger('qty', true);
                const channel = (interaction.options.getChannel('channel') || interaction.channel!);
                if ((channel as any)?.type !== ChannelType.GuildText) {
                    return interaction.reply({ ephemeral: true, content: 'Pick a text channel.' });
                }
                const p = await prisma.product.findUnique({ where: { sku } });
                if (!p) return interaction.reply({ ephemeral: true, content: `Unknown SKU ${sku}.` });
                if (p.stockQty < qty) return interaction.reply({ ephemeral: true, content: `Not enough stock. Available: ${p.stockQty}` });

                const offer = await prisma.offer.create({
                    data: {
                        guildId: interaction.guildId!,
                        productId: p.id,
                        qty,
                        remaining: qty,
                        channelId: (channel as any).id,
                        createdBy: interaction.user.id,
                    }
                });

                const embed = new EmbedBuilder()
                    .setTitle(`🛒 ${p.name}`)
                    .setDescription(
                        `Price: **${p.priceBems} BEMs**\n` +
                        `In this post: **${qty}** available.\n` +
                        `Click **Request** and a trader will coordinate **in game**.`
                    )
                    .setFooter({ text: `SKU: ${p.sku}` });

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`req:${offer.id}`).setLabel('Request').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`info:${offer.id}`).setLabel('Info').setStyle(ButtonStyle.Secondary),
                );
                const msg = await (channel as any).send({ embeds: [embed], components: [row] });
                await prisma.offer.update({ where: { id: offer.id }, data: { messageId: msg.id } });

                return interaction.reply({ ephemeral: true, content: 'Posted!' });
            }

            // ---------- wallet group ----------
            if (group === 'wallet' && sub === 'show') {
                const user = interaction.user;
                const w = await prisma.wallet.findUnique({
                    where: { guildId_userId: { guildId: interaction.guildId!, userId: user.id } }
                });
                if (!w) return interaction.reply({ ephemeral: true, content: 'You have no wallet yet.' });
                return interaction.reply({
                    ephemeral: true,
                    content: `Your wallet → ${w.bolts}🔩 / ${w.ductTape}🩹 / ${w.planks}🪵`
                });
            }

            if (group === 'wallet_admin' && sub === 'deposit') {
                if (!(await isAdmin(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Admin required.' });
                }
                const user = interaction.options.getUser('user', true);
                const bolts = interaction.options.getInteger('bolts', true);
                const duct = interaction.options.getInteger('duct_tape', true);
                const planks = interaction.options.getInteger('planks', true);
                const w = await prisma.wallet.upsert({
                    where: { guildId_userId: { guildId: interaction.guildId!, userId: user.id } },
                    update: { bolts: { increment: bolts }, ductTape: { increment: duct }, planks: { increment: planks } },
                    create: { guildId: interaction.guildId!, userId: user.id, bolts, ductTape: duct, planks },
                });
                await prisma.transaction.create({
                    data: {
                        guildId: interaction.guildId!,
                        kind: 'WALLET_DEPOSIT',
                        dBolts: bolts, dDuctTape: duct, dPlanks: planks,
                        walletUserId: user.id, actedBy: interaction.user.id, memo: 'admin deposit'
                    }
                });
                return interaction.reply({
                    ephemeral: true,
                    content: `Deposited to <@${user.id}> → +${bolts}🔩 +${duct}🩹 +${planks}🪵 (now ${w.bolts}/${w.ductTape}/${w.planks})`
                });
            }

            // ---------- materials group ----------
            if (group === 'materials' && sub === 'show') {
                const g = await prisma.guild.findUnique({ where: { id: interaction.guildId! }, include: { invMaterials: true } });
                const m = g!.invMaterials;
                const embed = new EmbedBuilder()
                    .setTitle('Guild Materials')
                    .setDescription(`Bolts: **${m.bolts}**\nDuct Tape: **${m.ductTape}**\nPlanks: **${m.planks}**`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (group === 'materials' && sub === 'set') {
                if (!(await isAdmin(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Admin required.' });
                }
                const bolts = interaction.options.getInteger('bolts', true);
                const duct = interaction.options.getInteger('duct_tape', true);
                const planks = interaction.options.getInteger('planks', true);
                const g = await prisma.guild.findUnique({ where: { id: interaction.guildId! } });
                await prisma.materials.update({
                    where: { id: g!.materialsId },
                    data: { bolts, ductTape: duct, planks }
                });
                return interaction.reply({
                    ephemeral: true,
                    content: `Updated guild materials → Bolts ${bolts}, Duct Tape ${duct}, Planks ${planks}.`
                });
            }

            // ---------- product group ----------
            if (group === 'product' && sub === 'add') {
                if (!(await isAdmin(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Admin required.' });
                }
                const name = interaction.options.getString('name', true);
                const sku = normSKU(interaction.options.getString('sku', true));
                const priceBems = interaction.options.getInteger('price_bems', true);
                const stock = interaction.options.getInteger('stock_qty', true);
                await prisma.product.create({
                    data: { guildId: interaction.guildId!, name, sku, priceBems, stockQty: stock }
                });
                return interaction.reply({
                    ephemeral: true,
                    content: `Added **${name}** (${sku}) · Price: ${priceBems} BEMs · Stock: ${stock}`
                });
            }

            if (group === 'product' && sub === 'setprice') {
                if (!(await isAdmin(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Admin required.' });
                }
                const sku = normSKU(interaction.options.getString('sku', true));
                const priceBems = interaction.options.getInteger('price_bems', true);
                const existing = await prisma.product.findUnique({ where: { sku } });
                if (!existing) {
                    return interaction.reply({ ephemeral: true, content: `SKU **${sku}** not found. Add it first with /rss product add.` });
                }
                await prisma.product.update({ where: { sku }, data: { priceBems } });
                return interaction.reply({ ephemeral: true, content: `Updated price for ${sku} → ${priceBems} BEMs` });
            }

            if (group === 'product' && sub === 'stock') {
                if (!(await isAdmin(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Admin required.' });
                }
                const sku = normSKU(interaction.options.getString('sku', true));
                const qty = interaction.options.getInteger('qty', true);
                const existing = await prisma.product.findUnique({ where: { sku } });
                if (!existing) {
                    return interaction.reply({ ephemeral: true, content: `SKU **${sku}** not found. Add it first with /rss product add.` });
                }
                const p = await prisma.product.update({ where: { sku }, data: { stockQty: qty } });
                await prisma.transaction.create({
                    data: {
                        guildId: interaction.guildId!,
                        kind: 'PRODUCT_RESTOCK',
                        productId: p.id,
                        productQty: qty,
                        actedBy: interaction.user.id,
                        memo: 'admin set stock',
                    }
                });
                return interaction.reply({ ephemeral: true, content: `Stock for ${p.name} now ${qty}.` });
            }

            return; // end chat command handling
        }

        // --- Buttons in offer/thread flow ---
        if (interaction.isButton()) {
            const [kind, offerId] = interaction.customId.split(':');
            const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { product: true } });
            if (!offer) return interaction.reply({ ephemeral: true, content: 'Offer missing.' });

            if (kind === 'info') {
                return interaction.reply({ ephemeral: true, content: `Remaining: ${offer.remaining}/${offer.qty}` });
            }

            if (kind === 'req') {
                if (offer.remaining <= 0) {
                    return interaction.reply({ ephemeral: true, content: 'Sold out in this post.' });
                }
                const channel = await client.channels.fetch(offer.channelId);
                const msg = await (channel as any).messages.fetch(offer.messageId!);
                const thread = await msg.startThread({
                    name: `Request ${offer.product.name} — ${interaction.user.username}`,
                    autoArchiveDuration: 1440,
                });
                const g = await prisma.guild.findUnique({ where: { id: interaction.guildId! } });
                await prisma.ticket.create({
                    data: {
                        guildId: interaction.guildId!,
                        offerId: offer.id,
                        buyerId: interaction.user.id,
                        threadId: thread.id,
                        status: 'OPEN',
                    }
                });
                await thread.send({
                    content: `New request by <@${interaction.user.id}> for **${offer.product.name}**. <@&${g?.traderRoleId}> please claim.`
                });
                const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`claim:${offer.id}`).setLabel('Claim').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`fulfill:${offer.id}`).setLabel('Fulfill').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`cancel:${offer.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger),
                );
                await thread.send({ content: 'Admin controls:', components: [controls] });
                return interaction.reply({ ephemeral: true, content: `Request opened: <#${thread.id}>. A trader will assist you in game.` });
            }

            if (kind === 'claim') {
                if (!(await isTrader(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Trader/Admin required to claim.' });
                }
                const t = await prisma.ticket.findFirst({
                    where: { offerId, status: { in: ['OPEN'] } },
                    orderBy: { createdAt: 'desc' }
                });
                if (!t) return interaction.reply({ ephemeral: true, content: 'No open ticket.' });
                await prisma.ticket.update({ where: { id: t.id }, data: { status: 'CLAIMED', claimedBy: interaction.user.id } });
                return interaction.reply({ ephemeral: true, content: 'Claimed. You are assigned.' });
            }

            if (kind === 'fulfill') {
                if (!(await isTrader(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Trader/Admin required.' });
                }
                const modal = new ModalBuilder()
                    .setCustomId(`fulfillModal:${offer.id}`)
                    .setTitle('Record in-game sale');

                const iQty = new TextInputBuilder().setCustomId('qty').setLabel('Quantity sold').setStyle(TextInputStyle.Short).setRequired(true);
                const iBolts = new TextInputBuilder().setCustomId('bolts').setLabel('Bolts received').setStyle(TextInputStyle.Short).setRequired(true).setValue('0');
                const iDuct = new TextInputBuilder().setCustomId('duct').setLabel('Duct Tape received').setStyle(TextInputStyle.Short).setRequired(true).setValue('0');
                const iPlanks = new TextInputBuilder().setCustomId('planks').setLabel('Planks received').setStyle(TextInputStyle.Short).setRequired(true).setValue('0');

                modal.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(iQty),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(iBolts),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(iDuct),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(iPlanks),
                );
                return interaction.showModal(modal);
            }

            if (kind === 'cancel') {
                if (!(await isTrader(interaction))) {
                    return interaction.reply({ ephemeral: true, content: 'Trader/Admin required.' });
                }
                const t = await prisma.ticket.findFirst({
                    where: { offerId, status: { in: ['OPEN', 'CLAIMED'] } },
                    orderBy: { createdAt: 'desc' }
                });
                if (!t) return interaction.reply({ ephemeral: true, content: 'No open ticket to cancel.' });
                await prisma.ticket.update({ where: { id: t.id }, data: { status: 'CANCELED', closedAt: new Date() } });
                return interaction.reply({ ephemeral: true, content: 'Ticket canceled.' });
            }
            return;
        }

        // --- Modal Submit: fulfill sale ---
        if (interaction.isModalSubmit()) {
            if (!interaction.customId.startsWith('fulfillModal:')) return;
            const offerId = interaction.customId.split(':')[1];
            const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { product: true } });
            if (!offer) return interaction.reply({ ephemeral: true, content: 'Offer missing.' });
            if (!(await isTrader(interaction))) {
                return interaction.reply({ ephemeral: true, content: 'Trader/Admin required.' });
            }

            const qty = parseInt(interaction.fields.getTextInputValue('qty') || '0', 10);
            const bolts = parseInt(interaction.fields.getTextInputValue('bolts') || '0', 10);
            const duct = parseInt(interaction.fields.getTextInputValue('duct') || '0', 10);
            const planks = parseInt(interaction.fields.getTextInputValue('planks') || '0', 10);

            if (qty <= 0) return interaction.reply({ ephemeral: true, content: 'Qty must be > 0.' });
            if (offer.remaining < qty) return interaction.reply({ ephemeral: true, content: `Only ${offer.remaining} remaining in this post.` });

            // Validate that the BEMs paid match qty * priceBems
            const required = qty * offer.product.priceBems;
            const paid = bolts + duct + planks;
            if (paid !== required) {
                return interaction.reply({
                    ephemeral: true,
                    content: `Payment mismatch: required **${required} BEMs** but recorded **${paid}** (🔩${bolts} + 🩹${duct} + 🪵${planks}).`
                });
            }

            await prisma.$transaction(async (tx) => {
                // decrement offer + product stock
                await tx.offer.update({ where: { id: offer.id }, data: { remaining: { decrement: qty } } });
                await tx.product.update({ where: { id: offer.productId }, data: { stockQty: { decrement: qty } } });
                // increment guild materials
                const g = await tx.guild.findUnique({ where: { id: interaction.guildId! } });
                await tx.materials.update({
                    where: { id: g!.materialsId },
                    data: {
                        bolts: { increment: bolts },
                        ductTape: { increment: duct },
                        planks: { increment: planks },
                    }
                });
                // ticket close + transaction log
                const t = await tx.ticket.findFirst({
                    where: { offerId: offer.id, status: { in: ['OPEN', 'CLAIMED'] } },
                    orderBy: { createdAt: 'desc' }
                });
                await tx.transaction.create({
                    data: {
                        guildId: interaction.guildId!,
                        kind: 'PRODUCT_SALE',
                        dBolts: bolts, dDuctTape: duct, dPlanks: planks,
                        productId: offer.productId,
                        productQty: -qty,
                        offerId: offer.id,
                        ticketId: t?.id,
                        actedBy: interaction.user.id,
                        memo: `Fulfilled ${qty}x ${offer.product.name}`,
                    }
                });
                if (t) {
                    await tx.ticket.update({
                        where: { id: t.id },
                        data: { status: 'CLOSED', closedAt: new Date(), claimedBy: t.claimedBy ?? interaction.user.id }
                    });
                }
            });

            return interaction.reply({
                ephemeral: true,
                content: `Recorded sale of ${qty}x ${offer.product.name}; added +${bolts}🔩 +${duct}🩹 +${planks}🪵 to guild.`
            });
        }
    } catch (e: any) {
        console.error(e);
        if (interaction.isRepliable()) {
            interaction.reply({ ephemeral: true, content: `Error: ${e.message ?? e}` }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);