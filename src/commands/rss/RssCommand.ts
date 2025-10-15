import {
    SlashCommandSubcommandBuilder,
    ChatInputCommandInteraction
} from 'discord.js';
import type { CommandLike } from '../../framework/types.js';
import { CommandBase } from '../../framework/Command.js';
import { buildRssBuilder } from '../../framework/Registry.js';

// Subcommands
import { Shop } from './subcommands/Shop.js';
import { List } from './subcommands/List.js';
import { Wallet } from './subcommands/Wallet.js';
import { PosSetup } from './subcommands/PosSetup.js';
import { MaterialsShow } from './subcommands/MaterialsShow.js';
import { MaterialsSet } from './subcommands/MaterialsSet.js';
import { ProductAdd } from './subcommands/ProductAdd.js';
import { ProductSetPrice } from './subcommands/ProductSetPrice.js';
import { ProductSetStock } from './subcommands/ProductSetStock.js';
import { WalletDeposit } from './subcommands/WalletDeposit.js';
import { BemCheckout } from './subcommands/BemCheckout.js';
import { BemCheckin } from './subcommands/BemCheckin.js';
import { BemHolders } from './subcommands/BemHolders.js';
import { BemMy } from './subcommands/BemMy.js';

export class RssCommand extends CommandBase implements CommandLike {
    constructor() {
        super();
        // Register subcommand implementations
        this.registerSubcommand(new Shop());
        this.registerSubcommand(new List());
        this.registerSubcommand(new Wallet());
        this.registerSubcommand(new PosSetup());
        this.registerSubcommand(new MaterialsShow());
        this.registerSubcommand(new MaterialsSet());
        this.registerSubcommand(new ProductAdd());
        this.registerSubcommand(new ProductSetPrice());
        this.registerSubcommand(new ProductSetStock());
        this.registerSubcommand(new WalletDeposit());
        this.registerSubcommand(new BemCheckout());
        this.registerSubcommand(new BemCheckin());
        this.registerSubcommand(new BemHolders());
        this.registerSubcommand(new BemMy());
    }

    data() {
        const builder = buildRssBuilder();

        builder.addSubcommand((sc: SlashCommandSubcommandBuilder) =>
            sc.setName('shop').setDescription('Open the Roadside Shop UI/link')
        );
        builder.addSubcommand((sc) =>
            sc.setName('list').setDescription('Show current inventory for the guild')
        );
        builder.addSubcommand((sc) =>
            sc.setName('wallet').setDescription('Show your wallet balance')
        );
        // Admin-only subcommands (enforced at runtime):
        builder.addSubcommand((sc) =>
            sc.setName('pos-setup').setDescription('Admin: configure POS for this guild')
        );
        builder.addSubcommand((sc) =>
            sc.setName('materials-show').setDescription('Admin: show materials table')
        );
        builder.addSubcommand((sc) =>
            sc.setName('materials-set').setDescription('Admin: set a material value')
                .addStringOption(opt =>
                    opt.setName('material').setDescription('Material name').setRequired(true)
                )
                .addNumberOption(opt =>
                    opt.setName('value').setDescription('Numeric value').setRequired(true)
                )
        );
        builder.addSubcommand((sc) =>
            sc.setName('product-add').setDescription('Admin: add a product')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Product name').setRequired(true)
                )
                .addNumberOption(opt =>
                    opt.setName('price').setDescription('Price').setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('stock').setDescription('Initial stock').setRequired(true)
                )
        );
        builder.addSubcommand((sc) =>
            sc.setName('product-setprice').setDescription('Admin: set product price')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Product name').setRequired(true)
                )
                .addNumberOption(opt =>
                    opt.setName('price').setDescription('New price').setRequired(true)
                )
        );
        builder.addSubcommand((sc) =>
            sc.setName('product-setstock').setDescription('Admin: set product stock')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Product name').setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('stock').setDescription('New stock').setRequired(true)
                )
        );
        builder.addSubcommand((sc) =>
            sc.setName('wallet-deposit').setDescription('Admin: deposit to a user wallet')
                .addUserOption(opt =>
                    opt.setName('user').setDescription('Target user').setRequired(true)
                )
                .addNumberOption(opt =>
                    opt.setName('amount').setDescription('Amount to deposit').setRequired(true)
                )
        );

        builder.addSubcommand((sc) =>
            sc.setName('bem-checkout').setDescription('Admin: check out BEM units')
                .addStringOption(o => o.setName('bem').setDescription('BEM id').setRequired(true))
                .addIntegerOption(o => o.setName('qty').setDescription('Quantity').setRequired(true))
        );
        builder.addSubcommand((sc) =>
            sc.setName('bem-checkin').setDescription('Admin: return BEM units')
                .addStringOption(o => o.setName('bem').setDescription('BEM id').setRequired(true))
                .addIntegerOption(o => o.setName('qty').setDescription('Quantity').setRequired(true))
        );
        builder.addSubcommand((sc) =>
            sc.setName('bem-holders').setDescription('Admin: list who holds BEMs')
        );
        builder.addSubcommand((sc) =>
            sc.setName('bem-my').setDescription('Admin: show BEMs you hold')
        );

        return builder;
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await this.executeSub(interaction);
    }
}
