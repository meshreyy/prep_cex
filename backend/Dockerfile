FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
COPY shared/db/package.json ./shared/db/
COPY backend/package.json ./backend/
COPY engine/package.json ./engine/
RUN bun install
COPY shared/db/ ./shared/db/
COPY backend/ ./backend/
RUN cd shared/db && bunx prisma generate
WORKDIR /app/backend
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
