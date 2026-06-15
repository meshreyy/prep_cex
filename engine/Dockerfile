FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
COPY shared/db/package.json ./shared/db/
COPY backend/package.json ./backend/
COPY engine/package.json ./engine/
RUN bun install
COPY shared/db/ ./shared/db/
COPY engine/ ./engine/
RUN cd shared/db && bunx prisma generate
WORKDIR /app/engine
CMD ["bun", "run", "src/index.ts"]
