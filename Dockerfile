FROM oven/bun:1-alpine AS base
WORKDIR /app
COPY package.json bun.lock ./

FROM base AS production
ENV NODE_ENV=production
RUN bun install --frozen-lockfile --production
COPY . .
USER bun
CMD ["bun", "start"]

FROM base AS test
ENV NODE_ENV=test
RUN bun install --frozen-lockfile
COPY . .
USER bun
CMD ["bun", "integration-test"]