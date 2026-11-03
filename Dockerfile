FROM oven/bun:1-alpine AS base
WORKDIR /app
COPY package.json bun.lock ./

FROM base AS production
ENV NODE_ENV=production
RUN bun install --frozen-lockfile --production
COPY . .
USER bun
CMD ["bun", "start"]

FROM base AS development
ENV NODE_ENV=development
RUN bun install --frozen-lockfile
COPY . .
USER bun
CMD ["bun", "start"]

FROM base AS test
ENV NODE_ENV=test
RUN bun install --frozen-lockfile
COPY . .
USER bun
CMD ["bun", "integration-test"]

FROM base AS debug-test
ENV NODE_ENV=test
RUN bun install --frozen-lockfile
COPY . .
USER bun
CMD ["bun", "debug:integration-test"]

FROM base AS job-production
ENV NODE_ENV=production
RUN bun install --frozen-lockfile --production
COPY . .
USER bun
CMD ["bun", "job"]

FROM base AS job-development
ENV NODE_ENV=development
RUN bun install --frozen-lockfile
COPY . .
USER bun
CMD ["bun", "job"]