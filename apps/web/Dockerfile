# Bellwether web (Next.js 15). Context = repo root. NEXT_PUBLIC_API_URL is read
# server-side at request time (pages are force-dynamic server components), so it
# is a RUNTIME env var, not a build arg.
#   docker build -f apps/web/Dockerfile -t bellwether-web .
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

ENV NODE_ENV=production
# Railway injects $PORT; the start script binds ${PORT:-3001}.
EXPOSE 3001
CMD ["pnpm", "--filter", "@bellwether/web", "start"]
