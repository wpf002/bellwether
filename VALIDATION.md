# Phase 1 Buyer-Validation Kit

The gate (ROADMAP Phase 1): put the digest in front of **5–10 real potential
buyers** and find out if they'd pay. This is a human step — no amount of code
substitutes for it. This kit makes running it fast.

## The artifact

A cited weekly SaaS digest PDF. Regenerate the latest:

```
docker compose up -d && pnpm db:migrate
node --env-file=.env apps/worker/dist/scheduler.js scrape saas
# wait for extraction, then:
node --env-file=.env apps/worker/dist/scheduler.js digest saas <startISO> <endISO>
node --env-file=.env apps/worker/dist/render.js saas   # → out/digest-saas-*.pdf
```

## Who to talk to (target the buyer, not the curious)

Competitive-intelligence / product-marketing / founder roles at B2B SaaS
companies who **today** do this manually (Friday roundup emails) or pay for
Crayon/Klue. 5–10 conversations.

## Outreach (cold, short)

> Subject: 2-min look — weekly SaaS competitive digest
>
> I built a tool that produces a weekly, fully-cited digest of what your market
> is doing — competitor launches, pricing moves, and buyer complaints — each
> claim linked to its source. Attaching a real sample. Worth a 15-min call to
> tell me if it's useful and what's missing?

## Interview script (15 min) — listen, don't pitch

1. How do you track competitors / the market today? How long does it take?
2. (Show the digest.) What here is useful? What's noise?
3. What's missing that you'd need before you'd rely on it?
4. Who would use this, and how often?
5. **Willingness to pay:** "If this arrived every week, accurate and cited,
   would you pay for it? At $99/mo? $299/mo? $999/mo?" (Anchor to the built
   plans.) Watch for "yes, here's my card" vs. "cool" (politeness ≠ demand.)
6. Would you introduce me to one other person who has this problem?

## Scorecard (one row per prospect)

| Prospect | Role / company | Does this manually today? | Pays now? | Useful (1–5) | Would pay? | $ / mo | Top missing thing |
| -------- | -------------- | ------------------------- | --------- | ------------ | ---------- | ------ | ----------------- |
|          |                |                           |           |              |            |        |                   |

## Decision (the actual gate)

- **GO** — ≥ ~40% give a concrete yes at a real price (intent to pay, not
  politeness). Proceed; the rest of the stack is already built.
- **NO / PIVOT** — vague interest, "lower the price," or "I'd use it free":
  the data/framing/industry is wrong. Fix that before anything else. The
  feedback loop (Phase 5) + config packs (Phase 2) make iterating cheap.

Record outcomes here as you go.
