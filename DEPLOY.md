# Deploying Bellwether

Target: **Railway** (Phase 6). Five services off one repo, plus two managed
add-ons. Actual provisioning needs a Railway account + a Stripe account for live
billing — the app models plans/limits/MRR itself, and Stripe is a drop-in for
the billing _integration_ (webhook → set `orgs.plan` / `canceled_at`).

## Services

| Service               | Build                        | Start                                                   | Notes                                                                        |
| --------------------- | ---------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `api`                 | `pnpm install && pnpm build` | `pnpm --filter @bellwether/api start`                   | Fastify; public HTTP                                                         |
| `worker`              | same                         | `pnpm --filter @bellwether/worker start`                | BullMQ consumers                                                             |
| `web`                 | same                         | `pnpm --filter @bellwether/web start`                   | Next.js; set `NEXT_PUBLIC_API_URL` to the api URL                            |
| `scheduler` (one-off) | same                         | `node apps/worker/dist/scheduler.js schedule-all daily` | register daily scrape+digest jobs for ALL 20 industries once (in prod Redis) |
| `migrate` (release)   | same                         | `pnpm db:migrate`                                       | run on deploy before api/worker start                                        |

Add-ons: **Postgres** (→ `DATABASE_URL`) and **Redis** (→ `REDIS_URL`).

Each long-running service (`api`, `worker`, `web`) ships a Dockerfile under
`apps/<svc>/Dockerfile` (build context = repo root). The `scheduler`/`migrate`
steps are one-offs run via `railway run` against the deployed env, not standing
services.

## Provision (Railway CLI)

```bash
railway login                       # one-time
railway init                        # create the project
railway add --database postgres
railway add --database redis

# one service per app (Dockerfile path set per service in the dashboard or via config)
railway up --service api            # repeat for worker, web

# wire env on api + worker + web (DATABASE_URL/REDIS_URL reference the add-ons):
railway variables --service api \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'REDIS_URL=${{Redis.REDIS_URL}}' \
  --set "ANTHROPIC_API_KEY=…" --set "EXTRACT_MODEL=claude-haiku-4-5-20251001"
# web also needs NEXT_PUBLIC_API_URL = the api service's public URL.

railway run --service api pnpm db:migrate                                   # schema
railway run --service worker node apps/worker/dist/scheduler.js schedule-all daily   # the 20 crons
```

Use **haiku** for `EXTRACT_MODEL` on the always-on schedule — daily × ~250
sources × 20 industries is a lot of extraction; haiku keeps the cost sane.

## Carry the existing corpus over (optional but recommended)

Don't start from zero — port the ~2.7k signals already gathered locally so the
time-series has a head start:

```bash
pg_dump "$LOCAL_DATABASE_URL" --no-owner --no-privileges \
  | psql "$(railway variables --service api --kv | grep '^DATABASE_URL=' | cut -d= -f2-)"
```

(Run AFTER `db:migrate` so the schema exists; or dump+restore data-only.)

## Environment

See `.env.example` for the full list. Required in prod: `DATABASE_URL`,
`REDIS_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_API_URL`. Recommended:
`ADMIN_TOKEN` (gates `/admin/metrics`), `REQUIRE_AUTH=true` (lock read endpoints
to subscribed orgs), SMTP + `DIGEST_*`/`ALERT_*` for delivery and paging.

## Observability

- API/worker log structured JSON via pino (`LOG_LEVEL`). Ship to Railway logs or
  a drain.
- `GET /admin/metrics` (x-admin-token) → MRR, active orgs by plan, churn, signal
  volume, shipped digests.
- `GET /industries/:id/sources` + the `monitor` CLI (non-zero exit) → source
  health for alerting.
- `GET /industries/:id/quality` → per-industry quality trend.

## Onboarding a customer (self-serve)

1. `POST /signup {orgName,email,plan}` → returns an API key (shown once).
2. `POST /subscriptions {industryId}` with the key (admin) → entitle the org.
3. Use the key as `Authorization: Bearer <key>`; rate limited per plan.

## Still external (need accounts; data model is ready)

- **Stripe**: checkout + webhook to set `orgs.plan`/`canceled_at`. Plan limits,
  entitlement caps, and MRR already compute off those columns.
- **Web session login**: the API is key-authed (B2B). A browser login (NextAuth
  or similar) would sit in front of `web`; not built.
- **Live Railway provisioning**: this doc + the start commands above; not run.
