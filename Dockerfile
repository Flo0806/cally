# Stage 1: Build
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# No native modules: SQLite is Node's built-in node:sqlite
RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:24-bookworm-slim

WORKDIR /app

COPY --from=builder /app/.output ./.output

# SQLite lives here, mount a volume on it
VOLUME ["/app/.data"]

EXPOSE 3000

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["node", ".output/server/index.mjs"]
