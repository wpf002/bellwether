import type { IndustryPack } from "@bellwether/core";

/**
 * The reference pack. Phase 1 goes embarrassingly deep on this ONE vertical
 * before any second pack is added.
 *
 * Source curation (the part that takes domain judgment + a TOS read — see
 * COMPLIANCE.md):
 *  - Everything here is an RSS/Atom feed, which publishers explicitly offer for
 *    syndication — the most TOS-defensible collection method, and the only one
 *    the Phase 1 `rss-news` adapter supports. Competitor pricing pages and
 *    review sites (G2/Capterra) are deliberately excluded for now: they need a
 *    dedicated HTML adapter (Phase 2) and a closer TOS read, and the review
 *    sites actively prohibit automated access.
 *  - `extractAs` scopes each source to the entity kinds it can credibly yield:
 *    news/aggregators → market_event; first-party company blogs → company +
 *    market_event (the post's own company, its launches/pricing moves); a
 *    public Hacker News discussion feed → sentiment_theme (buyer praise/gripes).
 *  - The HN feed is flagged `mayContainPersonalData` (posts carry usernames).
 *    Per COMPLIANCE we extract only themes/polarity from it and store no
 *    individual-level data; revisit before adding more social sources.
 */
export const saasPack: IndustryPack = {
  id: "saas",
  label: "B2B SaaS",
  version: "1.0.0",
  description:
    "Competitive and market intelligence for B2B software: positioning, pricing, feature movement, and buyer sentiment.",
  entityKinds: ["company", "sentiment_theme", "market_event"],
  sources: [
    // --- Industry news & aggregators → market events ---
    {
      id: "saas-techcrunch",
      label: "TechCrunch",
      kind: "rss",
      adapter: "rss-news",
      url: "https://techcrunch.com/feed/",
      mayContainPersonalData: false,
      extractAs: ["market_event"],
    },
    {
      id: "saas-theverge",
      label: "The Verge",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.theverge.com/rss/index.xml",
      mayContainPersonalData: false,
      extractAs: ["market_event"],
    },
    {
      id: "saas-venturebeat",
      label: "VentureBeat",
      kind: "rss",
      adapter: "rss-news",
      url: "https://venturebeat.com/feed/",
      mayContainPersonalData: false,
      extractAs: ["market_event"],
    },
    {
      id: "saas-hackernews",
      label: "Hacker News (front page)",
      kind: "rss",
      adapter: "rss-news",
      url: "https://hnrss.org/frontpage",
      mayContainPersonalData: false,
      extractAs: ["market_event"],
    },
    {
      id: "saas-theregister",
      label: "The Register",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.theregister.com/headlines.atom",
      mayContainPersonalData: false,
      extractAs: ["market_event"],
    },
    {
      id: "saas-saastr",
      label: "SaaStr",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.saastr.com/feed/",
      mayContainPersonalData: false,
      extractAs: ["market_event"],
    },
    // --- First-party company/product blogs → company + market events ---
    {
      id: "saas-stripe",
      label: "Stripe Blog",
      kind: "rss",
      adapter: "rss-news",
      url: "https://stripe.com/blog/feed.rss",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "saas-github",
      label: "The GitHub Blog",
      kind: "rss",
      adapter: "rss-news",
      url: "https://github.blog/feed/",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "saas-gitlab",
      label: "GitLab Blog",
      kind: "rss",
      adapter: "rss-news",
      url: "https://about.gitlab.com/atom.xml",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "saas-figma",
      label: "Figma Blog",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.figma.com/blog/feed/atom.xml",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "saas-hubspot",
      label: "HubSpot Marketing Blog",
      kind: "rss",
      adapter: "rss-news",
      url: "https://blog.hubspot.com/marketing/rss.xml",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "saas-intercom",
      label: "Intercom Blog",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.intercom.com/blog/feed/",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "saas-openai",
      label: "OpenAI News",
      kind: "rss",
      adapter: "rss-news",
      url: "https://openai.com/news/rss.xml",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    // --- Competitor pricing pages (server-rendered HTML) → rich company profiles ---
    // Vendors' own /pricing pages are TOS-defensible and robots-permitted (verified),
    // and give the pricing-tier + feature detail that thin blog-derived company
    // signals lack. Scoped to `company`. SPA pricing pages (e.g. Atlassian, HubSpot)
    // return no text on a plain fetch — they need the deferred Playwright fetcher.
    {
      id: "saas-stripe-pricing",
      label: "Stripe — Pricing",
      kind: "html",
      adapter: "html-page",
      url: "https://stripe.com/pricing",
      mayContainPersonalData: false,
      extractAs: ["company"],
    },
    {
      id: "saas-notion-pricing",
      label: "Notion — Pricing",
      kind: "html",
      adapter: "html-page",
      url: "https://www.notion.com/pricing",
      mayContainPersonalData: false,
      extractAs: ["company"],
    },
    {
      id: "saas-linear-pricing",
      label: "Linear — Pricing",
      kind: "html",
      adapter: "html-page",
      url: "https://linear.app/pricing",
      mayContainPersonalData: false,
      extractAs: ["company"],
    },
    {
      id: "saas-slack-pricing",
      label: "Slack — Pricing",
      kind: "html",
      adapter: "html-page",
      url: "https://slack.com/pricing",
      mayContainPersonalData: false,
      extractAs: ["company"],
    },
    {
      id: "saas-vercel-pricing",
      label: "Vercel — Pricing",
      kind: "html",
      adapter: "html-page",
      url: "https://vercel.com/pricing",
      mayContainPersonalData: false,
      extractAs: ["company"],
    },
    // --- Public community sentiment → buyer complaints/praise ---
    // Reddit and Lobsters both disallow our bot in robots.txt (verified), and the
    // base adapter fails closed. hnrss.org (a Hacker News RSS service) permits
    // us, so HN discussion is the Phase 1 sentiment source. Stronger buyer-review
    // sources (G2/Capterra) need a Phase 2 HTML adapter + TOS review.
    {
      id: "saas-hn-discussion",
      label: "Hacker News — SaaS discussion",
      kind: "social_public",
      adapter: "rss-news",
      url: "https://hnrss.org/newest?q=SaaS&points=10",
      mayContainPersonalData: true,
      extractAs: ["sentiment_theme"],
    },
  ],
  kpis: [
    {
      id: "share_of_voice",
      label: "Share of voice (by company)",
      aggregation: "share_of_voice",
      entityKind: "company",
      field: "name",
    },
    {
      id: "negative_themes",
      label: "Top buyer complaints",
      aggregation: "count",
      entityKind: "sentiment_theme",
      field: "polarity",
    },
    {
      id: "pricing_changes",
      label: "Pricing changes (30d)",
      aggregation: "count",
      entityKind: "market_event",
      field: "kind",
    },
  ],
  prompts: [
    {
      id: "saas-company",
      entityKind: "company",
      system:
        "Extract a SOFTWARE COMPANY/VENDOR profile from the text. A company is an organization that sells software — NOT a product, feature, event, conference, or funding round. If the text names no specific software company (e.g. it's about a product launch, an event recap, or a general topic), set name to null and leave the other fields empty. Use the company's own name, not a product's. JSON keys: name (string|null), domain, positioning, pricingTiers[], features[].",
    },
    {
      id: "saas-sentiment",
      entityKind: "sentiment_theme",
      system:
        "Extract one recurring buyer-sentiment theme and its polarity (positive|neutral|negative) from review/forum text. Do not weight or score importance. JSON keys: theme, polarity.",
    },
    {
      id: "saas-event",
      entityKind: "market_event",
      system:
        "Extract one market event (product_launch|pricing_change|funding|acquisition|leadership_change|regulatory|campaign|other) with a headline and occurredAt if stated. JSON keys: kind, headline, occurredAt.",
    },
  ],
};
