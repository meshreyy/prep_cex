FROM oven/bun:1 AS base
WORKDIR /app

# Copy root package.json and workspace config
COPY package.json bun.lock ./
COPY shared/db/package.json ./shared/db/
COPY engine/package.json ./engine/

# Install dependencies
RUN bun install

# Copy source
COPY shared/db/ ./shared/db/
COPY engine/ ./engine/

# Generate prisma client
RUN cd shared/db && bunx prisma generate

WORKDIR /app/engine
CMD ["bun", "run", "src/index.ts"]
