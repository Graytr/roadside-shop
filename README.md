# Friendly Farmers – Hay Day POS (Discord)

A Discord-based POS for Hay Day guilds where foods are sold for **Bolts, Duct Tape, Planks** (BEMs). Trades happen **in game**; the bot handles requests, pings traders, opens a thread, and lets admins **record** the finished trade.

## Quickstart
1. `npm i`
2. `npx prisma db push`
3. `npm run deploy:commands`
4. `npm run dev`
5. In Discord:
- `/pos-setup admin_role:@Admins trader_role:@Traders`
- `/materials set bolts:0 duct_tape:0 planks:0`
- `/product add name:"Carrot Pie" sku:CARROT_PIE price_bems:2 stock_qty:25`
- `/shop sku:CARROT_PIE qty:10 channel:#market`

## Flow
- Buyer clicks **Request** → thread is created + traders pinged → trader meets buyer **in game** → trader clicks **Fulfill** and records qty + BEMs.

## Commands
- `/materials show|set` – view/set guild BEMs
- `/product add|setprice|stock` – manage foods, prices, stocks
- `/shop` – post an offer (thread-based requests)
- `/settle` – record a sale manually (no thread)

## Roadmap
- `/ledger` (admin transaction list)
- Per-offer limits/cooldowns
- Either/Or pricing (1 bolt **or** 2 planks)
- Assign default "stock owners" and auto-ping them