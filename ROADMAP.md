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
- [ ] **Quality note:** `company` extraction from first-party blogs is noisy
      (the accuracy harness flagged events/products mis-tagged as companies);
      tune prompts/sources before the buyer gate.
- **Validation gate:** put it in front of 5–10 potential buyers. The question is
  "would you pay $X for this every week?" If no, the data/framing/industry is
  wrong — fix that before building infrastructure.

Exit: at least a handful of buyers say yes (or tell you precisely what's off).

## Phase 2 — The industry-config layer _(make "pivot" real)_

Goal: prove the engine generalizes without per-industry code.

- Harden the pack abstraction (sources, entity kinds, KPIs, prompts).
- Add a second vertical (e-commerce retail) using only a new pack.
- Measure: adding a third vertical should take **days, not weeks**.
- Pack-validation on boot; pack versioning in the `industries` table.

Exit: vertical #2 ships with zero engine changes; vertical #3 is a day of work.

## Phase 3 — Minimal dashboard _(overlaps Phase 2)_

Goal: a usable UI without scope creep.

- Three views only: **Market Overview**, **Competitor Tracker**, **Trend Feed**.
- Select industry, set key competitors, see a running change feed, pull a digest.
- LLM narrative summaries in the UI — but with the citation layer intact (each
  claim links to its source records). Build against the `frontend-design`
  system, not ad hoc.
- No maps, no simulation, no compliance module yet.

Exit: a user can self-serve a digest for their industry from the browser.

## Phase 4 — Scraping infrastructure hardening

Goal: stop being brittle.

- Move from hand-written fetchers to a managed/queue-backed crawl (managed
  scraping service or a self-hosted Playwright pool for JS-heavy sources).
- Monitoring: scraper-failure alerts, data-freshness indicators, per-source
  coverage reports (the `sources.healthy` column exists for this).
- Anti-bot resilience, retry/backoff, proxy strategy where TOS-permitted.

Exit: a source going dark pages you; it does not silently rot the product.

## Phase 5 — Insight quality + feedback loop _(the moat)_

Goal: get smarter with use; this is the defensibility.

- Strict citation layer everywhere (already modeled — enforce in UI/exports).
- Optional human-review step before a digest is marked "shipped."
- Capture which insights users act on; feed that back into source
  prioritization and prompt tuning per industry.

Exit: per-industry intelligence quality measurably improves over time.

## Phase 6 — Product hardening

Goal: turn it into a business.

- Multi-tenant, auth, org/workspace model, billing.
- Rate/usage limits, audit logs, role-based access.
- Deployment to Railway (api, worker, web, Postgres, Redis), prod observability.

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
