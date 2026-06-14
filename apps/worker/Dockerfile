# Bellwether worker (BullMQ consumers: scrape → extract → digest). Also hosts
# the scheduler/monitor/quality CLIs (run via `railway run`). Context = repo root.
#   docker build -f apps/worker/Dockerfile -t bellwether-worker .
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@bellwether/worker", "start"]
