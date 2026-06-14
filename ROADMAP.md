# Bellwether — Roadmap

The product thesis: **choose an industry, and Bellwether tells you where that
market is heading** — from public web, news, and social sources, structured
through an auditable pipeline.

The single biggest risk is not technical. It is the temptation to support many
industries before being excellent at one. "Pivot to any industry" is a pitch
line, not an architecture. Every phase below is ordered to resist that.

Guiding invariants (do not violate without a deliberate decision):

1. **Provenance or it doesn't exist.** No signal, KPI, or digest claim ships
   without a traceable chain back to raw source records.
2. **The LLM extracts; it never decides.** Structured output only. Scoring,
   ranking, and prediction are deterministic code over counted provenance.
3. **Crawl etiquette is structural.** robots.txt + rate limiting live in the
   base adapter. No adapter can opt out. See `COMPLIANCE.md`.
4. **Industries are config, not code.** Adding a vertical = authoring a pack.
   If it requires engine changes, the abstraction failed.

---

## Phase 0 — Foundation _(this scaffold)_

Goal: a coherent, pushable monorepo with the architecture locked.

- pnpm + Turbo monorepo, strict TypeScript, ESM.
- `@bellwether/core`: signal model, auditable transform chain, entity schema,
  IndustryPack schema (the config engine).
- `@bellwether/db`: Drizzle schema enforcing provenance at storage.
- `@bellwether/scrapers`: base adapter with robots.txt + rate limiting.
- `@bellwether/extract`: structured-output-only LLM layer.
- `@bellwether/industries`: pack registry + SaaS reference pack.
- `@bellwether/digest`: provenance-carrying weekly digest builder.
- `apps/api` (Fastify), `apps/worker` (BullMQ), `apps/web` (Next.js skeleton).
- Docker Compose for Postgres + Redis.
- ESLint + Prettier + Vitest wired through the workspace; first `runChain`
  lineage test locks the provenance contract.
- GitHub Actions CI: typecheck · lint · format · test · build on every PR.

Exit: `pnpm install && pnpm build` clean; `docker compose up` brings up infra;
CI green.

## Phase 1 — One industry, end to end _(the only thing that matters next)_

Goal: prove the output is worth paying for, in ONE vertical (SaaS), with NO UI.

- [x] Curate ~14 real, TOS-permitted sources for the SaaS pack (RSS/Atom: news,
      first-party company blogs, one Hacker News discussion feed). `extractAs`
      scopes each. (Reddit/Lobsters disallow our bot; deferred review sites.)
- [x] Implement the three worker processors: scrape → extract → digest, plus
      structured-output extraction and the initial DB migration.
- [x] Run the pipeline live (real API key + feeds): Stripe → 20 cited signals →
      digest → PDF, provenance verified end to end.
- [x] Render the weekly digest to a cited PDF (`pdfkit`).
- [x] Weekly cron (BullMQ job schedulers), accuracy spot-check harness, and
      email delivery (SMTP-config-gated; no-op with a notice if unconfigured).
- [x] Tightened `company` extraction (the accuracy harness had flagged
      events/products mis-tagged as companies): prompt now declines non-company
      text → null, and empty extractions are dropped. Re-audit: company signals
      went from 10 noisy to 4 correct on the Stripe sample.
- **Validation gate:** put it in front of 5–10 potential buyers. The question is
  "would you pay $X for this every week?" If no, the data/framing/industry is
  wrong — fix that before building infrastructure.

Exit: at least a handful of buyers say yes (or tell you precisely what's off).

## Phase 2 — The industry-config layer _(make "pivot" real)_

Goal: prove the engine generalizes without per-industry code.

- [x] Add a second vertical (e-commerce retail) as a pack only — shipped with
      ZERO engine changes (only the industries package + registry line). Live
      proof: same pipeline → 30 signals (events + sentiment) for `ecommerce`.
- [x] Pack-validation on boot (registry parses every pack; tested).
- [x] Hardened the pack abstraction: per-source `maxItems` override + pack
      `version` field (the two gaps Phase 1's full run exposed).
- [x] KPI engine: declarative aggregations (count, share_of_voice, mean, min,
      max, latest) over signals, deterministic, surfaced in the digest. Live:
      share-of-voice by company, complaint counts by polarity.
- [x] Pack versioning persisted in the `industries` table (upsert on scrape).
- Measure: adding a third vertical should take **days, not weeks**.

Exit: vertical #2 ships with zero engine changes; vertical #3 is a day of work.

## Phase 3 — Minimal dashboard _(overlaps Phase 2)_

Goal: a usable UI without scope creep.

- [x] Three views: **Market Overview**, **Competitor Tracker**, **Trend Feed**
      (tabbed Next.js dashboard at `/[industry]`).
- [x] Industry picker (home), per-user competitor selection (localStorage),
      running change feed (events), on-demand digest pull (live `/digest`).
- [x] Read-only API surface: `/industries/:id/{overview,companies,events,digest}`,
      every finding/event/company carrying source-URL citations.
- [x] Narrative summary with the citation layer intact. NOTE: implemented as a
      DETERMINISTIC narrative (counts only) rather than an LLM one — keeps the
      "LLM extracts, never decides" invariant clean and the dashboard key-free.
      An LLM-narration variant can be layered on later.
- [~] Built with clean Tailwind. The repo has no `frontend-design` system to
  build against; revisit if/when one lands.
- No maps, no simulation, no compliance module yet.

Exit: a user can self-serve a digest for their industry from the browser. ✓
(live-verified against seeded saas/ecommerce data).

## Phase 4 — Scraping infrastructure hardening

Goal: stop being brittle.

- [x] Retry/backoff in the base adapter: transient failures (network/429/5xx)
      retry with exponential backoff + jitter; terminal 4xx (incl. 403 bot-walls)
      do NOT retry — resilience, not evasion. `ScrapeError` carries the status.
- [x] Monitoring: per-source health (healthy/down/stale), freshness, last error,
      coverage counts — persisted to `sources` and exposed at
      `/industries/:id/sources` + a `monitor` CLI that exits non-zero (pageable)
      and emails an alert (SMTP-gated) when sources fail or go stale.
- [~] Managed crawl / Playwright pool for JS-heavy sources, proxy strategy:
  deferred — needs external infra (a browser pool / proxy provider). The
  fetch path is isolated so a managed fetcher drops in behind the same
  adapter contract. Phase 1 RSS sources don't need JS rendering.

Exit: a source going dark pages you; it does not silently rot the product. ✓
(verified: a robots-blocked source flips to DOWN with the error recorded, and
the monitor exits non-zero for cron/CI to page.)

## Phase 5 — Insight quality + feedback loop _(the moat)_

Goal: get smarter with use; this is the defensibility.

- [x] Citation layer enforced, not just modeled: `assertCited` throws on any
      uncited finding at the digest boundary (provenance is now a hard contract).
- [x] Human-review/ship gate: digests are `draft` until reviewed; `POST
/digests/:id/ship` records reviewer + timestamp; `GET /industries/:id/digests`
      lists status.
- [x] Feedback loop: `POST /feedback` (useful / not_useful / acted) →
      `sourcePriority` ranks sources by yield + feedback (what to double down on
      vs. re-tune/drop) → closes feedback to source/prompt choices.
- [x] Per-industry quality metric (citation rate, coverage, useful rate, acted,
      by-kind), snapshotted over time (`quality_snapshots` + `snapshot-quality`
      CLI) and served at `/industries/:id/quality` with history.

Exit: per-industry intelligence quality measurably improves over time. ✓
mechanism in place — snapshots accumulate a trend; live-verified (citation 100%,
coverage 93%, useful 50%).

## Phase 6 — Product hardening

Goal: turn it into a business.

- [x] Multi-tenant accounts: orgs / users / memberships, API-key auth (sha256,
      never stored plaintext), RBAC (owner>admin>member>viewer), audit log.
      (Intelligence is shared catalog data; tenancy governs access, not data.)
- [x] Plan-based billing model + entitlements: free/pro/enterprise with industry
      caps + per-plan rate limits; MRR/churn computed from plan + cancel state.
      Stripe is a drop-in (webhook → set `orgs.plan`/`canceled_at`).
- [x] Rate/usage limits (per-plan, per-org), audit logs, role guards on
      mutations (feedback/ship), entitlement checks per industry.
- [x] Self-serve onboarding (`POST /signup` → org + key), key/subscription mgmt,
      `/admin/metrics` (MRR, orgs by plan, churn, coverage) gated by ADMIN_TOKEN.
- [~] Railway deploy + prod observability: documented in `DEPLOY.md` (5 services + Postgres/Redis, env, pino logs, metrics endpoints). Actual provisioning
  needs a Railway account; not run here.

Exit: a stranger can sign up and pay; MRR instrumented. ✓ (signup→key→subscribe→
use verified live; MRR via /admin/metrics. Live payment needs Stripe wired.)

## Phase 7 — Advanced modules _(only if validated)_

The flashy GPT directions live here, as bolt-ons — never as the core bet:

- Sentiment-driven opportunity map.
- Competitive-interaction simulation _(explicitly deferred: requires historical
  data and model accuracy that don't exist early — do not promise it sooner)._
- Regulatory-compliance dashboard per industry.

---

### What would have to be true to win

- Scraped data is reliably accurate and fresh enough to drive decisions.
- The insight layer interprets, not just aggregates.
- You stay in one or two verticals long enough to build a knowledge advantage.
- You find buyers paying for this today in a worse way (manual Friday reports,
  underused Crayon/Klue seats).
- The legal posture holds at scale (see `COMPLIANCE.md`).
