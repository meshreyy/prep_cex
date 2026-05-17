# backpack-depth-indexer

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.


# Backpack Depth Indexer

A perpetual futures exchange backend (similar to Backpack/Binance) built with Express, TypeScript, and Bun.

## What it does
- Users can sign up, sign in, and deposit funds (onramp)
- Users place buy/sell orders on perpetual futures markets (SOL, ETH, etc.)
- A matching engine pairs compatible bids and asks using FIFO priority
- Positions are tracked with margin, PnL, and liquidation prices
- A liquidation engine monitors index prices from Binance and liquidates positions when collateral falls below maintenance margin
- Mark Price (index price from external exchanges) is used for liquidation checks to prevent market manipulation

## Tech Stack
- **Runtime:** Bun
- **Framework:** Express + TypeScript
- **Database:** PostgreSQL (NeonDB) via Prisma
- **Cache:** Redis (Docker)
- **Auth:** bcrypt + JWT

## API Routes
- `POST /signup` — register a new user
- `POST /signin` — authenticate and receive JWT
- `POST /onramp` — deposit funds to available collateral
- `POST /order` — place a new order
- `DELETE /order` — cancel an order
- `GET /equity/available` — check available equity
- `GET /positions/open/:marketId` — view open positions
- `GET /positions/closed/:marketId` — view closed positions
- `GET /orders/open/:marketId` — view open orders
- `GET /orders/:marketId` — view all orders for a market
- `GET /fills` — view trade history
