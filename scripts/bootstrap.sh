#!/usr/bin/env bash
#
# Bellwether bootstrap — one-shot local setup on a fresh clone.
# Idempotent: safe to re-run. Covers env, deps, infra, and database.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf "\n\033[1m==> %s\033[0m\n" "$1"; }

# ---- 0. Tooling checks ----
say "Checking tooling"
command -v node >/dev/null || { echo "Node 20+ required"; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm required: npm i -g pnpm"; exit 1; }
command -v docker >/dev/null || { echo "Docker required for Postgres/Redis"; exit 1; }
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' \
  || { echo "Node 20+ required (found $(node -v))"; exit 1; }

# ---- 1. Environment ----
say "Setting up .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — set ANTHROPIC_API_KEY before running the worker."
else
  echo ".env already exists — leaving it untouched."
fi

# ---- 2. Dependencies ----
say "Installing dependencies (pnpm)"
pnpm install

# ---- 3. Build packages ----
say "Building workspace"
pnpm build || echo "(build had errors — expected while Phase 1 processors are stubs)"

# ---- 4. Infrastructure ----
say "Starting Postgres + Redis (docker compose)"
docker compose up -d
echo "Waiting for Postgres to be healthy..."
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U bellwether >/dev/null 2>&1; then
    echo "Postgres is ready."; break
  fi
  sleep 1
done

# ---- 5. Database ----
say "Generating + applying database migrations"
pnpm db:generate
pnpm db:migrate

say "Bootstrap complete"
cat <<'NEXT'

Next:
  - Set ANTHROPIC_API_KEY in .env (used only for structured extraction).
  - Start everything:        pnpm dev
  - API:                     http://localhost:4000/health
  - Web:                     http://localhost:3001
  - See the plan:            ROADMAP.md   (you are at Phase 0)
NEXT
