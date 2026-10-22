FROM oven/bun:1.2.14-slim AS bun

FROM node:24.22.1-trixie-slim AS build
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
ENV BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache
COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
RUN bun run build

FROM node:24.22.1-trixie-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
