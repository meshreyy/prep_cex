# Perp CEX

Perpetual futures exchange: React frontend, Express backend, in-memory matching engine, Postgres on Neon, services linked by **Redis Streams**.

## Architecture

```
┌─────────────┐     HTTP/REST      ┌─────────────┐
│   Frontend  │◄──────────────────►│   Backend   │
│  (React)    │                    │  (Express)  │
└─────────────┘                    └──────┬──────┘
                                          │
                                          │ Redis Streams
                                          ▼
                                   ┌─────────────┐
                                   │    Engine   │
                                   │  (Matching) │
                                   │             │
                                   │ • In-memory │
                                   │   orderbook │
                                   │ • Binance   │
                                   │   mark WS   │
                                   └──────┬──────┘
                                          │
                                          │ Redis Streams
                                          ▼
                                   ┌─────────────┐
                                   │  DB Poller  │
                                   │             │
                                   │ • Events →  │
                                   │   Postgres  │
                                   └─────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   Postgres  │
                                   │   (NeonDB)  │
                                   └─────────────┘
```

## How data flows

1. User hits the **backend** (REST): sign up, deposit, place/cancel order.
2. Backend writes a **command** to Redis (`stream:commands`) with a `correlationId`.
3. **Engine** reads the command, matches on the in-memory orderbook, updates balances/positions, and writes a **response** back on Redis for that `correlationId`.
4. Engine also pushes **events** (fills, balance changes) on a separate stream.
5. **DB poller** reads events and saves them to **Postgres**.
6. On engine restart, balances are **loaded from Postgres** into memory so collateral is not lost.

**Streams in use**

| Stream | Direction | What moves |
|--------|-----------|------------|
| `stream:commands` | Backend → Engine | Place order, cancel, etc. |
| Response queue | Engine → Backend | Result for each `correlationId` |
| Events queue | Engine → DB poller | Fills and state to persist |

## Tech stack

- **Frontend** — React  
- **Backend** — Express, JWT + bcrypt  
- **Engine** — Bun, in-memory orderbook, Binance WS for mark price  
- **DB** — Postgres (Neon), Prisma (`shared/db`)  
- **Bus** — Redis Streams  

## Why Streams, not Pub/Sub?

| | Pub/Sub | Streams |
|---|---------|---------|
| Messages | Only while subscribed; gone if offline | Stored until read/trimmed |
| Crash | Lost orders/fills | Consumer group can replay from last ack |
| Use case | Live UI ticks | Commands, responses, money-moving events |

Pub/Sub is fine for “nice to have” updates. Orders and balances need a **durable log** so nothing disappears when the engine or poller restarts.

## Repo layout

```
engine/       # Matching + Redis consumer + Binance WS
shared/db/    # Prisma schema + client
backend/      # REST API
db-poller/    # Events → Postgres
frontend/     # React UI
```
