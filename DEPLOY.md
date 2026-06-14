# Deploying Bellwether

Target: **Railway** (Phase 6). Five services off one repo, plus two managed
add-ons. Actual provisioning needs a Railway account + a Stripe account for live
billing — the app models plans/limits/MRR itself, and Stripe is a drop-in for
the billing _integration_ (webhook → set `orgs.plan` / `canceled_at`).

## Services

| Service             | Build                        | Start                                                     | Notes                                                                    |
| ------------------- | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `api`               | `pnpm install && pnpm build` | `pnpm --filter @bellwether/api start`                     | Fastify; public HTTP                                                     |
| `worker`            | same                         | `pnpm --filter @bellwether/worker start`                  | BullMQ consumers                                                         |
| `web`               | same                         | `pnpm --filter @bellwether/web start`                     | Next.js; set `NEXT_PUBLIC_API_URL` to the api URL                        |
| `scheduler` (cron)  | same                         | `node apps/worker/dist/scheduler.js schedule-weekly saas` | register weekly jobs once; also `monitor` + `snapshot-quality` on a cron |
| `migrate` (release) | same                         | `pnpm db:migrate`                                         | run on deploy before api/worker start                                    |

Add-ons: **Postgres** (→ `DATABASE_URL`) and **Redis** (→ `REDIS_URL`).

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
