# Bellwether — Legal & Compliance Posture

Scraping public data is not the same as "no legal constraints." A
scraping-based product that gets blocked or sued is not a product. This is a
day-one design constraint, not a future problem. Get a lawyer to review the
approach before scaling.

## Non-negotiables baked into the code

- **robots.txt is respected by default.** `SCRAPER_RESPECT_ROBOTS=true`. The
  base adapter (`@bellwether/scrapers`) fails _closed_ — if robots.txt can't be
  fetched, the request is denied, not allowed.
- **Rate limiting is enforced in the base adapter**, not left to each scraper.
  `SCRAPER_DEFAULT_RATE_LIMIT_MS` + per-source override.
- **Identifiable user agent.** `SCRAPER_USER_AGENT` is sent on every request.

## Standing rules

- **Prefer official APIs** over scraping wherever a source offers one.
- **Avoid personal data.** The `SourceDef.mayContainPersonalData` flag exists to
  force an explicit decision. Sources that expose individual-level data
  (e.g. LinkedIn profiles) are the trap — under GDPR/CCPA, "publicly available"
  does not mean "free to process." Default to excluding it.
- **Honor Terms of Service.** Some sites prohibit automated access; ignoring
  that is legal risk. Track per-source TOS status alongside the source.
- **Respect bot-detection systems.** Do not attempt to bypass CAPTCHAs or
  human-verification challenges.
- **No copyrighted content reproduction.** Store provenance and short factual
  extracts; do not republish source text wholesale.

## Open items to resolve before scale

- Jurisdiction review (US + any EU sources).
- Data-retention policy for raw records containing incidental personal data.
- A documented takedown / cease-and-desist response process.
