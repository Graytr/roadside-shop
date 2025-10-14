import 'dotenv/config';
import {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ChannelType, Interaction, PermissionFlagsBits
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const isAdmin = async (interaction: Interaction) => {
    if (!interaction.inGuild()) return false;

    const g = await prisma.guild.findUnique({ where: { id: interaction.guildId! } });

    // If no admin role configured yet → allow bootstrap by owner or users with Admin/ManageGuild perms
    const memberPerms = 'memberPermissions' in interaction ? interaction.memberPermissions : null;
    const hasElevated =
        !!memberPerms?.has(PermissionFlagsBits.Administrator) ||
        !!memberPerms?.has(PermissionFlagsBits.ManageGuild) ||
        interaction.guild?.ownerId === interaction.user.id;

    if (!g?.adminRoleId) return hasElevated;

    // Once configured, require the configured role OR elevated perms (owner/admin can still override)
    const hasRole =
        interaction.member && 'roles' in interaction.member &&
        (interaction.member.roles as any).cache.has(g.adminRoleId);

    return hasRole || hasElevated;
};

const isTrader = async (interaction: Interaction) => {
  if (!interaction.inGuild()) return false;
  const g = await prisma.guild.findUnique({ where: { id: interaction.guildId! } });
  if (!g?.traderRoleId) return false;
  return interaction.member && 'roles' in interaction.member && (interaction.member.roles as any).cache.has(g.traderRoleId);
};

client.once('ready', async () => {
  console.log(`✓ Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isModalSubmit()) return;

        if (interaction.inGuild()) {
            await prisma.guild.upsert({
                where: {id: interaction.guildId!},
                update: {},
                create: {id: interaction.guildId!, name: interaction.guild!.name, invMaterials: {create: {}}}
            });
        }

        if (interaction.isChatInputCommand()) {
            const {commandName} = interaction;

            if (commandName === 'pos-setup') {
                if (!(await isAdmin(interaction))) return interaction.reply({
                    ephemeral: true,
                    content: 'Admin role required (set once you configure it). Ask a server admin to run this.'
                });
                const adminRole = interaction.options.getRole('admin_role', true);
                const traderRole = interaction.options.getRole('trader_role', true);
                await prisma.guild.update({
                    where: {id: interaction.guildId!},
                    data: {adminRoleId: adminRole.id, traderRoleId: traderRole.id}
                });
                return interaction.reply({
                    ephemeral: true,
                    content: `Configured. Admin: <@&${adminRole.id}> · Trader: <@&${traderRole.id}>`
                });
            }

            if (commandName === 'materials') {
                const sub = interaction.options.getSubcommand();
                if (sub === 'show') {
                    const g = await prisma.guild.findUnique({
                        where: {id: interaction.guildId!},
                        include: {invMaterials: true}
                    });
                    const m = g!.invMaterials;
                    const embed = new EmbedBuilder().setTitle('Guild Materials').setDescription(`Bolts: **${m.bolts}**
Duct Tape: **${m.ductTape}**
Planks: **${m.planks}**`);
                    return interaction.reply({embeds: [embed], ephemeral: true});
                }
                if (sub === 'set') {
                    if (!(await isAdmin(interaction))) return interaction.reply({
                        ephemeral: true,
                        content: 'Admin role required.'
                    });
                    const bolts = interaction.options.getInteger('bolts', true);
                    const duct = interaction.options.getInteger('duct_tape', true);
                    const planks = interaction.options.getInteger('planks', true);
                    const g = await prisma.guild.findUnique({where: {id: interaction.guildId!}});
                    await prisma.materials.update({where: {id: g!.materialsId}, data: {bolts, ductTape: duct, planks}});
                    return interaction.reply({
                        ephemeral: true,
                        content: `Updated guild materials → Bolts ${bolts}, Duct Tape ${duct}, Planks ${planks}.`
                    });
                }
            }

            if (commandName === 'product') {
                const sub = interaction.options.getSubcommand();
                if (!(await isAdmin(interaction))) return interaction.reply({
                    ephemeral: true,
                    content: 'Admin role required.'
                });

                if (sub === 'add') {
                    const name = interaction.options.getString('name', true);
                    const sku = interaction.options.getString('sku', true);
                    const price = interaction.options.getInteger('price_bems', true);
                    const stock = interaction.options.getInteger('stock_qty', true);
                    await prisma.product.create({
                        data: {
                            guildId: interaction.guildId!,
                            name,
                            sku,
                            priceBems: price,
                            stockQty: stock
                        }
                    });
                    return interaction.reply({
                        ephemeral: true,
                        content: `Added **${name}** (${sku}) · Price: ${price} · Stock: ${stock}`
                    });
                }
                if (sub === 'setprice') {
                    const sku = interaction.options.getString('sku', true);
                    const price = interaction.options.getInteger('price', true);
                    await prisma.product.update({
                        where: { sku },
                        data: { price }
                    });
                    return interaction.reply({
                        ephemeral: true,
                        content: `Updated price for ${sku} → ${price} BEMs`
                    });
                }
                if (sub === 'stock') {
                    const sku = interaction.options.getString('sku', true);
                    const qty = interaction.options.getInteger('qty', true);
                    const p = await prisma.product.update({where: {sku}, data: {stockQty: qty}});
                    await prisma.transaction.create({
                        data: {
                            guildId: interaction.guildId!,
                            kind: 'PRODUCT_RESTOCK',
                            productId: p.id,
                            productQty: qty,
                            actedBy: interaction.user.id,
                            memo: 'admin set stock'
                        }
                    });
                    return interaction.reply({ephemeral: true, content: `Stock for ${p.name} now ${qty}.`});
                }
            }

            if (commandName === 'wallet') {
                const sub = interaction.options.getSubcommand();
                if (sub === 'deposit') {
                    if (!(await isAdmin(interaction))) return interaction.reply({
                        ephemeral: true,
                        content: 'Admin role required.'
                    });
                    const user = interaction.options.getUser('user', true);
                    const bolts = interaction.options.getInteger('bolts', true);
                    const duct = interaction.options.getInteger('duct_tape', true);
                    const planks = interaction.options.getInteger('planks', true);
                    const w = await prisma.wallet.upsert({
                        where: {guildId_userId: {guildId: interaction.guildId!, userId: user.id}},
                        update: {bolts: {increment: bolts}, ductTape: {increment: duct}, planks: {increment: planks}},
                        create: {guildId: interaction.guildId!, userId: user.id, bolts, ductTape: duct, planks}
                    });
                    await prisma.transaction.create({
                        data: {
                            guildId: interaction.guildId!,
                            kind: 'WALLET_DEPOSIT',
                            dBolts: bolts,
                            dDuctTape: duct,
                            dPlanks: planks,
                            walletUserId: user.id,
                            actedBy: interaction.user.id,
                            memo: 'admin deposit'
                        }
                    });
                    return interaction.reply({
                        ephemeral: true,
                        content: `Deposited to <@${user.id}> → +${bolts}🔩 +${duct}🩹 +${planks}🪵 (now ${w.bolts}/${w.ductTape}/${w.planks})`
                    });
                }
                if (sub === 'show') {
                    const user = interaction.options.getUser('user') ?? interaction.user;
                    const w = await prisma.wallet.findUnique({
                        where: {
                            guildId_userId: {
                                guildId: interaction.guildId!,
                                userId: user.id
                            }
                        }
                    });
                    if (!w) return interaction.reply({ephemeral: true, content: `<@${user.id}> has no wallet yet.`});
                    return interaction.reply({
                        ephemeral: true,
                        content: `<@${user.id}> wallet → ${w.bolts}🔩 / ${w.ductTape}🩹 / ${w.planks}🪵`
                    });
                }
            }

            if (commandName === 'shop') {
                if (!(await isTrader(interaction))) return interaction.reply({
                    ephemeral: true,
                    content: 'Trader role required.'
                });
                const sku = interaction.options.getString('sku', true);
                const qty = interaction.options.getInteger('qty', true);
                const channel = (interaction.options.getChannel('channel') || interaction.channel!);
                if (channel!.type !== ChannelType.GuildText) return interaction.reply({
                    ephemeral: true,
                    content: 'Pick a text channel.'
                });
                const p = await prisma.product.findUnique({where: {sku}});
                if (!p) return interaction.reply({ephemeral: true, content: 'Unknown SKU.'});
                if (p.stockQty < qty) return interaction.reply({
                    ephemeral: true,
                    content: `Not enough stock. Available: ${p.stockQty}`
                });

                const offer = await prisma.offer.create({
                    data: {
                        guildId: interaction.guildId!,
                        productId: p.id,
                        qty,
                        remaining: qty,
                        channelId: channel!.id,
                        createdBy: interaction.user.id
                    }
                });

                const embed = new EmbedBuilder()
                    .setTitle(`🛒 ${p.name}`)
                    .setDescription(`Price: **${p.priceBems} BEMs**\nIn this post: **${qty}** available.\nClick **Request** and a trader will coordinate **in game**.`)
                    .setFooter({text: `SKU: ${p.sku}`});

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`req:${offer.id}`).setLabel('Request').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`info:${offer.id}`).setLabel('Info').setStyle(ButtonStyle.Secondary)
                );
                const msg = await (channel as any).send({embeds: [embed], components: [row]});
                await prisma.offer.update({where: {id: offer.id}, data: {messageId: msg.id}});
                return interaction.reply({ephemeral: true, content: 'Posted!'});
            }

            if (commandName === 'settle') {
                if (!(await isAdmin(interaction))) return interaction.reply({
                    ephemeral: true,
                    content: 'Admin role required.'
                });
                const buyer = interaction.options.getUser('buyer', true);
                const sku = interaction.options.getString('sku', true);
                const qty = interaction.options.getInteger('qty', true);
                const bolts = interaction.options.getInteger('bolts', true);
                const duct = interaction.options.getInteger('duct_tape', true);
                const planks = interaction.options.getInteger('planks', true);
                const p = await prisma.product.findUnique({where: {sku}});
                if (!p) return interaction.reply({ephemeral: true, content: 'Unknown SKU.'});
                if (p.stockQty < qty) return interaction.reply({
                    ephemeral: true,
                    content: `Insufficient stock (${p.stockQty}).`
                });
                await prisma.$transaction(async (tx: any) => {
                    await tx.product.update({where: {id: p.id}, data: {stockQty: {decrement: qty}}});
                    const g = await tx.guild.findUnique({where: {id: interaction.guildId!}});
                    await tx.materials.update({
                        where: {id: g!.materialsId},
                        data: {bolts: {increment: bolts}, ductTape: {increment: duct}, planks: {increment: planks}}
                    });
                    await tx.transaction.create({
                        data: {
                            guildId: interaction.guildId!,
                            kind: 'PRODUCT_SALE',
                            dBolts: bolts,
                            dDuctTape: duct,
                            dPlanks: planks,
                            productId: p.id,
                            productQty: -qty,
                            walletUserId: buyer.id,
                            actedBy: interaction.user.id,
                            memo: `Manual settle: ${qty}x ${p.name}`
                        }
                    });
                });
                return interaction.reply({
                    ephemeral: true,
                    content: `Settled ${qty}x ${p.name}. Added +${bolts}🔩 +${duct}🩹 +${planks}🪵 to guild.`
                });
            }

            if (commandName === 'catalog') {
                const sub = interaction.options.getSubcommand();
                if (sub === 'list') {
                    const inStockOnly = interaction.options.getBoolean('in_stock_only') ?? false;
                    const page = Math.max(1, interaction.options.getInteger('page') ?? 1);
                    const PAGE = 10;

                    const where: any = {guildId: interaction.guildId!, isActive: true};
                    if (inStockOnly) where.stockQty = {gt: 0};

                    const [items, total] = await Promise.all([
                        prisma.product.findMany({
                            where,
                            orderBy: {name: 'asc'},
                            skip: (page - 1) * PAGE,
                            take: PAGE
                        }),
                        prisma.product.count({where})
                    ]);

                    if (!items.length) {
                        return interaction.reply({ephemeral: true, content: 'No products to show.'});
                    }

                    const lines = items.map((p: { name: any; sku: any; priceBems: any; stockQty: any; }) =>
                        `• **${p.name}** (SKU: ${p.sku}) — **${p.priceBems} BEMs** · Stock: **${p.stockQty}**`);


                    const embed = new EmbedBuilder()
                        .setTitle('📦 Product Catalog')
                        .setDescription(lines.join('\n'))
                        .setFooter({text: `Page ${page} of ${Math.max(1, Math.ceil(total / PAGE))} • ${inStockOnly ? 'In-stock only' : 'All active'}`});

                    return interaction.reply({embeds: [embed], ephemeral: true});
                }
            }

        }

        // Buttons & Modals
        if (interaction.isButton()) {
            const [kind, offerId] = interaction.customId.split(':');
            const offer = await prisma.offer.findUnique({where: {id: offerId}, include: {product: true}});
            if (!offer) return interaction.reply({ephemeral: true, content: 'Offer missing.'});

            if (kind === 'info') {
                return interaction.reply({ephemeral: true, content: `Remaining: ${offer.remaining}/${offer.qty}`});
            }

            if (kind === 'req') {
                if (offer.remaining <= 0) return interaction.reply({
                    ephemeral: true,
                    content: 'Sold out in this post.'
                });
                const channel = await client.channels.fetch(offer.channelId);
                const msg = await (channel as any).messages.fetch(offer.messageId!);
                const thread = await msg.startThread({
                    name: `Request ${offer.product.name} — ${interaction.user.username}`,
                    autoArchiveDuration: 1440
                });
                const g = await prisma.guild.findUnique({where: {id: interaction.guildId!}});
                await prisma.ticket.create({
                    data: {
                        guildId: interaction.guildId!,
                        offerId: offer.id,
                        buyerId: interaction.user.id,
                        threadId: thread.id
                    }
                });
                await thread.send({content: `New request by <@${interaction.user.id}> for **${offer.product.name}**. <@&${g?.traderRoleId}> please claim.`});
                const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`claim:${offer.id}`).setLabel('Claim').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`fulfill:${offer.id}`).setLabel('Fulfill').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`cancel:${offer.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
                );
                await thread.send({content: 'Admin controls:', components: [controls]});
                return interaction.reply({
                    ephemeral: true,
                    content: `Request opened: <#${thread.id}>. A trader will assist you to trade **in game**.`
                });
            }

            if (kind === 'claim') {
                if (!(await isTrader(interaction))) return interaction.reply({
                    ephemeral: true,
                    content: 'Trader role required to claim.'
                });
                const ticket = await prisma.ticket.findFirst({
                    where: {offerId, status: 'OPEN'},
                    orderBy: {createdAt: 'desc'}
                });
                if (!ticket) return interaction.reply({ephemeral: true, content: 'No open ticket.'});
                await prisma.ticket.update({
                    where: {id: ticket.id},
                    data: {status: 'CLAIMED', claimedBy: interaction.user.id}
                });
                return interaction.reply({ephemeral: true, content: `Claimed. You are assigned.`});
            }

            if (kind === 'fulfill') {
                if (!(await isTrader(interaction))) return interaction.reply({
                    ephemeral: true,
                    content: 'Trader/Admin role required.'
                });
                const modal = new ModalBuilder().setCustomId(`fulfillModal:${offer.id}`).setTitle('Record in-game sale');
                const qty = new TextInputBuilder().setCustomId('qty').setLabel('Quantity sold').setStyle(TextInputStyle.Short).setRequired(true);
                const bolts = new TextInputBuilder().setCustomId('bolts').setLabel('Bolts received').setStyle(TextInputStyle.Short).setRequired(true).setValue('0');
                const duct = new TextInputBuilder().setCustomId('duct').setLabel('Duct Tape received').setStyle(TextInputStyle.Short).setRequired(true).setValue('0');
                const planks = new TextInputBuilder().setCustomId('planks').setLabel('Planks received').setStyle(TextInputStyle.Short).setRequired(true).setValue('0');
                modal.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(qty),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(bolts),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(duct),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(planks)
                );
                return interaction.showModal(modal);
            }

            if (kind === 'cancel') {
                if (!(await isTrader(interaction))) return interaction.reply({
                    ephemeral: true,
                    content: 'Trader/Admin role required.'
                });
                const t = await prisma.ticket.findFirst({
                    where: {offerId, status: {in: ['OPEN', 'CLAIMED']}},
                    orderBy: {createdAt: 'desc'}
                });
                if (!t) return interaction.reply({ephemeral: true, content: 'No open ticket to cancel.'});
                await prisma.ticket.update({where: {id: t.id}, data: {status: 'CANCELED', closedAt: new Date()}});
                return interaction.reply({ephemeral: true, content: 'Ticket canceled.'});
            }
        }

        if (interaction.isModalSubmit()) {
            if (!interaction.customId.startsWith('fulfillModal:')) return;
            const offerId = interaction.customId.split(':')[1];
            const offer = await prisma.offer.findUnique({where: {id: offerId}, include: {product: true}});
            if (!offer) return interaction.reply({ephemeral: true, content: 'Offer missing.'});
            if (!(await isTrader(interaction))) return interaction.reply({
                ephemeral: true,
                content: 'Trader/Admin role required.'
            });

            const qty = parseInt(interaction.fields.getTextInputValue('qty') || '0', 10);
            const bolts = parseInt(interaction.fields.getTextInputValue('bolts') || '0', 10);
            const duct = parseInt(interaction.fields.getTextInputValue('duct') || '0', 10);
            const planks = parseInt(interaction.fields.getTextInputValue('planks') || '0', 10);
            if (qty <= 0) return interaction.reply({ephemeral: true, content: 'Qty must be > 0.'});
            if (offer.remaining < qty) return interaction.reply({
                ephemeral: true,
                content: `Only ${offer.remaining} remaining in this post.`
            });

            const required = qty * offer.product.priceBems;
            const paid = bolts + duct + planks;

            if (paid !== required) {
                return interaction.reply({
                    ephemeral: true,
                    content: `Payment mismatch: required **${required} BEMs** but recorded **${paid}** (🔩${bolts} + 🩹${duct} + 🪵${planks}).`
                });
            }

            await prisma.$transaction(async (tx: any) => {
                await tx.offer.update({where: {id: offer.id}, data: {remaining: {decrement: qty}}});
                await tx.product.update({where: {id: offer.productId}, data: {stockQty: {decrement: qty}}});
                const g = await tx.guild.findUnique({where: {id: interaction.guildId!}});
                await tx.materials.update({
                    where: {id: g!.materialsId},
                    data: {bolts: {increment: bolts}, ductTape: {increment: duct}, planks: {increment: planks}}
                });
                const t = await tx.ticket.findFirst({
                    where: {offerId: offer.id, status: {in: ['OPEN', 'CLAIMED']}},
                    orderBy: {createdAt: 'desc'}
                });
                await tx.transaction.create({
                    data: {
                        guildId: interaction.guildId!,
                        kind: 'PRODUCT_SALE',
                        dBolts: bolts,
                        dDuctTape: duct,
                        dPlanks: planks,
                        productId: offer.productId,
                        productQty: -qty,
                        offerId: offer.id,
                        ticketId: t?.id,
                        actedBy: interaction.user.id,
                        memo: `Fulfilled ${qty}x ${offer.product.name}`
                    }
                });
                if (t) await tx.ticket.update({
                    where: {id: t.id},
                    data: {status: 'CLOSED', closedAt: new Date(), claimedBy: t.claimedBy ?? interaction.user.id}
                });
            });

            return interaction.reply({
                ephemeral: true,
                content: `Recorded sale of ${qty}x ${offer.product.name}; added +${bolts}🔩 +${duct}🩹 +${planks}🪵 to guild.`
            });
        }
    } catch (e: any) {
        console.error(e);
        if (interaction.isRepliable()) interaction.reply({
            ephemeral: true,
            content: `Error: ${e.message}`
        }).catch(() => {
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
