# syntax=docker/dockerfile:1

FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend ./backend
COPY packages ./packages
RUN corepack enable \
    && pnpm install --frozen-lockfile \
    && pnpm --filter backend... build \
    && pnpm --filter backend... prune --prod

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/node_modules ./node_modules

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && groupadd -r app && useradd -r -g app app \
    && chown -R app:app /app \
    && chmod -R 555 /app \
    && mkdir -p /tmp/app && chown -R app:app /tmp/app

VOLUME /tmp/app
USER app
EXPOSE 8080 9108
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:8080/healthz || exit 1
CMD ["node", "--max-old-space-size=512", "dist/index.js"]
