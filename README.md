# Bellwether

**Industry-aware market intelligence.** Choose an industry; Bellwether scrapes
public web, news, and social sources, structures them through an auditable
pipeline, and tells you where that market is heading.

It is deliberately _not_ a feed reader with an LLM bolted on. Every claim it
makes is traceable to a raw source record, and the LLM is used in exactly one
role — turning unstructured text into structured data — never to score, rank,
or decide.

> Status: **Phase 0 (foundation scaffold).** See [`ROADMAP.md`](./ROADMAP.md).

## Architecture

pnpm + Turbo monorepo, strict TypeScript (ESM), Fastify API, BullMQ worker,
Next.js dashboard, PostgreSQL (Drizzle), Redis.

```
apps/
  api/         Fastify HTTP API (industries, health; expands per phase)
  worker/      BullMQ pipeline: scrape -> extract -> digest
  web/         Next.js dashboard (skeleton; full UI is Phase 3)
packages/
  core/        Signal model, auditable transform chain, entity + IndustryPack schemas
  db/          Drizzle schema + client (provenance enforced at storage)
  scrapers/    Source adapters; robots.txt + rate limiting in the base class
  extract/     Structured-output-only LLM extraction layer
  industries/  Industry-pack registry + SaaS reference pack (the config engine)
  digest/      Provenance-carrying weekly digest builder (the Phase 1 output)
  config/      Shared TS config
```

### Core invariants

1. **Provenance or it doesn't exist** — no signal/KPI/claim without a chain to raw records.
2. **The LLM extracts; it never decides** — structured output only.
3. **Crawl etiquette is structural** — robots.txt + rate limiting can't be skipped. See [`COMPLIANCE.md`](./COMPLIANCE.md).
4. **Industries are config, not code** — a new vertical is a new pack, no engine changes.

## Getting started

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env   # then fill in ANTHROPIC_API_KEY

# 3. Infra (Postgres + Redis)
pnpm infra:up

# 4. Database
pnpm db:generate
pnpm db:migrate

# 5. Dev (all apps via Turbo)
pnpm dev
```

API: http://localhost:4000 • Web: http://localhost:3001

## Scripts

| Command                        | Description                 |
| ------------------------------ | --------------------------- |
| `pnpm build`                   | Build all packages/apps     |
| `pnpm dev`                     | Run all apps in watch mode  |
| `pnpm typecheck`               | Typecheck the workspace     |
| `pnpm db:generate`             | Generate Drizzle migrations |
| `pnpm db:migrate`              | Apply migrations            |
| `pnpm db:studio`               | Open Drizzle Studio         |
| `pnpm infra:up` / `infra:down` | Start/stop Postgres + Redis |

## License

Proprietary. See [`LICENSE`](./LICENSE).
