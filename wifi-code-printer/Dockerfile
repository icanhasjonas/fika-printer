FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile 2>/dev/null || bun install --production

COPY . .

# Pre-convert logo to raster bitmap at build time
RUN bun run build-logo.ts 2>/dev/null || true

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
