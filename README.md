# Perp CEX

A perpetual futures centralized exchange (CEX) built as a monorepo. The **matching engine** keeps hot path state in memory for low latency; **PostgreSQL** (Neon) is the system of record; **Redis Streams** connect services with durable, replayable messaging.

---

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
                                   │  DB Poller  │  ← optional phase 2
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

### Request flow (target)

1. **Frontend** calls the **backend** over HTTP (auth, place/cancel order, balances, positions).
2. **Backend** publishes a command to a Redis Stream (`stream:commands`) with a `correlationId` for request/response pairing.
3. **Engine** reads commands via a **consumer group**, runs matching against in-memory orderbooks, updates balances/positions, and replies on a response stream.
4. **Engine** appends domain **events** (fills, balance updates, etc.) to an events stream for async persistence.
5. **DB poller** (later) consumes the events stream and writes to **Postgres** so the API and engine can recover after restarts.

### Phased rollout

| Phase | Status | Description |
|-------|--------|-------------|
| `shared/db` | Done | Prisma schema + Neon Postgres |
| `engine` | In progress | Types, in-memory store, config, hydrate, Binance mark-price WS, Redis Stream consumer |
| `backend` | Planned | Express API → Redis Streams ↔ engine |
| `db-poller` | Deferred | Skip for now; engine holds trading state in memory; backend talks to engine only via Redis |

On startup, the engine **hydrates** user balances from Postgres (`prisma.balance.findMany()`) so collateral survives engine restarts even before the poller exists.

---

## Monorepo layout

```
perp-v1-boilerplate/
├── engine/              # Matching engine (Bun)
│   └── src/
│       ├── index.ts           # Redis consumer loop (XREADGROUP)
│       ├── bootstrap/hydrate.ts
│       ├── store/perp-store.ts  # In-memory balances, books, orders
│       ├── ws/binance.ts        # External mark price feed
│       └── utils/events.ts      # XADD domain events
├── shared/db/           # @perp/shared-db — Prisma + Neon
│   └── prisma/schema.prisma
├── backend/             # (planned) Express REST API
├── db-poller/           # (planned) Stream → Postgres writer
└── frontend/            # (planned) React UI
```

---

## Tech stack

| Layer | Technology | Role |
|-------|------------|------|
| Runtime | [Bun](https://bun.sh) | Engine dev/runtime (workspaces) |
| API | Express 5 | HTTP for backend (planned) |
| UI | React | Trading frontend (planned) |
| Database | PostgreSQL on [Neon](https://neon.tech) | Users, orders, fills, balances |
| ORM | Prisma | Schema, migrations, typed client (`@perp/shared-db`) |
| Message bus | Redis Streams | Commands, responses, and events between services |
| Market data | Binance WebSocket | SOL/USDT trades → index/mark price in engine |
| Auth (planned) | JWT + bcrypt | Session/API auth on backend |

---

## Why Redis Streams (not Pub/Sub)?

Both patterns decouple producers and consumers, but a **perpetuals exchange** needs **durability**, **ordering**, and **safe replay**—Pub/Sub does not provide those.

### Redis Pub/Sub

- **Fire-and-forget**: subscribers only receive messages while connected.
- **No persistence**: if the engine or DB poller is down, messages are **lost**.
- **No acknowledgment**: no built-in “process then confirm” model.
- **Fan-out only**: every subscriber gets a copy; hard to scale **competing consumers** (multiple engine workers or poller instances) without duplicating work.

Fine for live tickers or “best effort” notifications—not for **place order**, **fill**, or **balance update**.

### Redis Streams

- **Durable log**: entries stay in the stream until trimmed (`MAXLEN`) or deleted.
- **Consumer groups** (`XGROUP CREATE`, `XREADGROUP`, `XACK`): workers claim messages, process them, and ack; unacked work can be **reclaimed** after a crash.
- **At-least-once processing**: a restarted engine or DB poller can continue from the last acknowledged ID instead of missing trades.
- **Single ordered log per stream**: commands and events have a clear sequence for debugging and reconciliation.
- **Request/response over streams**: backend `XADD`s a command with `correlationId`; engine `XADD`s the reply; backend reads by ID or a dedicated response stream—no shared in-process memory between processes.

### How this project uses Streams

| Stream / concept | Producer | Consumer | Purpose |
|------------------|----------|----------|---------|
| `stream:commands` | Backend | Engine (`engine` consumer group) | Place/cancel order, admin commands |
| Response stream (`RESPONSE_QUEUE`) | Engine | Backend | Command results tied to `correlationId` |
| Events stream (`EVENTS_QUEUE`) | Engine | DB poller (later) | Fills, balance changes → Postgres |

The engine already creates a consumer group on `stream:commands` and blocks on `XREADGROUP`—see `engine/src/index.ts`.

**Rule of thumb:** use **Pub/Sub** when a missed message is acceptable; use **Streams** when a missed message is a **lost trade or wrong balance**.

---

## In-memory engine state

Hot path data lives in `engine/src/store/perp-store.ts`:

- `BALANCES`, `ORDERBOOKS`, `POSITIONS`, `ORDERS`, `FILLS`
- `MARK_PRICE` updated from Binance WS (`engine/src/ws/binance.ts`)

Postgres holds the long-term record; the engine reloads balances on boot via `hydrateEngine()`.

---

## Environment variables

**Engine** (`engine/.env`):

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection URL |
| `INCOMING_QUEUE` | Command stream key (e.g. `stream:commands`) |
| `RESPONSE_QUEUE` | Stream for command responses |
| `EVENTS_QUEUE` | Stream for persistence events |

**Database** (`shared/db/.env`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |

---

## Development

Prerequisites: Bun, Redis, Neon database URL.

```bash
# Install dependencies (from repo root)
bun install

# Generate Prisma client & migrate
cd shared/db
bun run db:generate
bun run db:migrate

# Run engine
cd ../../engine
bun run dev
```
