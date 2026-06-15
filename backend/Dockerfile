FROM oven/bun:1 AS base
WORKDIR /app

# Copy root package.json and workspace config
COPY package.json bun.lock ./
COPY shared/db/package.json ./shared/db/
COPY backend/package.json ./backend/

# Install dependencies
RUN bun install

# Copy source
COPY shared/db/ ./shared/db/
COPY backend/ ./backend/

# Generate prisma client
RUN cd shared/db && bunx prisma generate

WORKDIR /app/backend
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
