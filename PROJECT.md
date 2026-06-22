# Bellwether — Project Description

## What it is

Bellwether is a **provenance-first market-intelligence platform**. You pick an industry, and it shows you where that market is heading — competitor moves, pricing shifts, product launches, funding, and buyer sentiment — mined from public sources and structured through an auditable pipeline. **Every single claim links back to the source record it came from.**

The core bet: most "AI market intelligence" tools are black boxes that summarize and hallucinate. Bellwether's differentiator is that you can *check the work*. The LLM only ever **extracts** facts from text; it never scores, ranks, or predicts. All the math (share of voice, event mix, sentiment) is deterministic code over those extracted facts, so every number is reproducible and traceable.

**Live now:** web at https://bellwether.up.railway.app, API at https://api-production-9a24.up.railway.app, deployed on Railway and accumulating fresh signals daily.

---

## The pipeline (collect → extract → aggregate → cite)

1. **Collect** — A scraper fetches robots.txt-permitted RSS/Atom feeds and server-rendered HTML pages: trade press, first-party company blogs, vendor pricing pages, and public Hacker News discussion. Every fetch checks `robots.txt` first and *fails closed* (disallowed → skipped, never retried on a hard block). Raw responses are stored verbatim as `raw_records`, deduplicated by content hash.

2. **Extract** — For each new raw record, an LLM (Claude **Haiku 4.5** in production) runs the industry pack's extraction prompts and returns **typed, schema-validated** structured output: companies, market events, and sentiment themes. Multi-company extraction pulls *every* company named in an article, not just one. Extraction is only trusted if it parses against the Zod schema.

3. **Aggregate** — KPIs are computed deterministically in code — plain counts over the extracted signals (share of voice, event-kind mix, sentiment polarity). No model judgment.

4. **Cite** — Every signal stores the id of the raw record it came from; every dashboard finding links to its source URL. A citation check refuses to ship any claim that isn't backed by a record.

This runs as a three-stage job fan-out (**scrape → extract → digest**) on BullMQ/Redis queues, consumed by an always-on worker.

---

## Core invariants (the design discipline)

- **Provenance on every signal** — no claim exists without a raw record behind it.
- **The model extracts, never decides** — judgment is left to deterministic code and to the user.
- **Crawl etiquette is enforced** — robots.txt fail-closed, retry/backoff that never retries a hard block.
- **Industries are config, not code** — adding a vertical is a config pack (sources + entity kinds + KPIs + prompts), zero engine changes.
- **Quality is measured** — per-source health and a per-industry quality score are tracked over time, with a feedback loop that re-ranks reliable sources.

---

## Coverage

**20 industries**, ~150 live sources total, ~2,700 cited signals and growing daily:

B2B SaaS · E-commerce & Retail · Fintech & Payments · Cybersecurity · Developer Tools · AI Infrastructure · Data & Analytics · Health · Marketing · HR · Real Estate & Property · Education · Cloud & Infra · Crypto & Web3 · Gaming · Robotics & Automation · Biotech · Climate · Logistics & Supply Chain · Legal.

SaaS and e-commerce are hand-curated flagship packs (rich first-party + pricing-page sources). The other 18 are template-generated but each gets depth: multiple Hacker News query angles, a TechCrunch topic feed, and an authoritative **Industry Dive** trade-news feed (Banking Dive, Cybersecurity Dive, Healthcare Dive, etc.) — all robots-permitted.

**Market-event taxonomy** spans 18 kinds (product_launch, product_update, pricing_change, funding, acquisition, partnership, expansion, leadership_change, layoffs, earnings, regulatory, legal, security_incident, research, analysis, guide, campaign, other) so the catch-all "other" bucket stays small.

---

## The product surface (web dashboard)

A dense, "terminal"-style Next.js dashboard per industry:

- **HUD metrics bar** — market events, company mentions, companies tracked, buyer complaints, live sources, watchlist (mono numerals, inline sparklines).
- **Market Overview** — a deterministic narrative; a **Most Mentioned** donut (top 7 companies, real favicon logos resolved from a curated domain map); **Buyer Sentiment** (positive/neutral/negative mix); **Event Mix**; a **Signal Momentum** 14-day trend strip; **What Changed** (recent events) and **Buyer Complaints** (cited).
- **Competitor Tracker** — check companies into a browser-local watchlist; an "Only My Watchlist" toggle scopes every view to them.
- **Trend Feed** — paginated event stream (20/page), each item linked to its source.

Plus top-level pages: **Methodology** (the pipeline + guarantees + live source coverage), **Pricing**, and **Watchlist** (cross-industry view of everything you track).

---

## Multi-tenancy & business model

- **Accounts**: orgs / users / memberships, API-key auth (sha256, never stored plaintext), RBAC (owner > admin > member > viewer), audit log.
- **Plans** (enforced by the API, defined in one place in `core/tenancy.ts`): **Free** $0 (1 industry, 30 rpm), **Pro** $99/mo (5 industries, 300 rpm, weekly cited-PDF digest), **Enterprise** $499/mo (unlimited, 3,000 rpm, RBAC, audit log, advanced modules).
- MRR / churn computed from plan + cancel state; `/admin/metrics` surface. Stripe is a documented drop-in (webhook → set plan); web checkout is the one remaining commercial piece.
- **Advanced modules** (Phase 7, deterministic re-slices — still cited): a sentiment-driven opportunity map and a per-industry regulatory feed.

---

## Operations

- **Daily cron jobs** on the deployed worker: 138 scrape jobs (06:00 UTC) + 20 digests (09:00) + a **daily status email** (13:00) that reports cron health, signal progression, and source health — branded to match the UI, delivered via Resend.
- **Monitoring**: source health endpoint + `monitor` CLI (non-zero exit to page), per-industry quality trend, structured pino logging.
- The whole thing runs ~$0.30–0.60/day in extraction cost at current volume (Haiku + content-hash dedup means only genuinely new articles are ever extracted).

---

## Architecture & stack

A **pnpm + Turbo monorepo**, strict TypeScript (ESM, NodeNext):

- **Packages**: `core` (entities, KPI engine, tenancy/plans, scope), `db` (Drizzle ORM + Postgres, queries, accounts), `scrapers` (robots-compliant adapters), `extract` (Anthropic structured-output extraction), `industries` (the 20 config packs), `digest` (weekly digest + PDF + email rendering).
- **Apps**: `api` (Fastify, read-only dashboard endpoints + accounts/admin), `worker` (BullMQ consumers + scheduler + status-report), `web` (Next.js 15 App Router, Tailwind, dependency-free SVG charts).
- **Infra**: Postgres + Redis (Railway managed add-ons), 3 GitHub-linked services each built from its own Dockerfile.

---

## The Prophet connection

Forecasting ("where is this *actually* heading") is deliberately **not** in Bellwether — that would violate the cite-everything invariant. Instead there's a read-only connector in the separate **Prophet** forecasting service (`ingest_bellwether.py`) that pulls Bellwether's `/trends` API and runs a benchmarked time-series model. Its own forecastability gate currently returns **"data too young"** — which is the point of the 90-day accumulation: once the corpus has real history, Prophet starts producing forecasts on top of Bellwether's cited facts, with the two systems cleanly separated.

---

## Status

All 8 roadmap phases (0–7) are built, tested, and deployed. The one formally-unmet gate is **buyer validation** — the roadmap's stated "thing that kills this" is going wide before proving someone pays. Everything is now running and gathering data for the summer; the natural next step isn't more features, it's putting the cited digest in front of real buyers.
