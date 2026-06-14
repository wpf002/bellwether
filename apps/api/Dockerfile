# Bellwether API (Fastify). Build context = repo root (pnpm/turbo monorepo).
#   docker build -f apps/api/Dockerfile -t bellwether-api .
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

ENV NODE_ENV=production
# Railway injects $PORT; index.ts honors PORT → API_PORT → 4000.
EXPOSE 4000
CMD ["pnpm", "--filter", "@bellwether/api", "start"]
