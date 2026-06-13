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
 *    public subreddit feed → sentiment_theme (buyer complaints/praise).
 *  - The subreddit feed is flagged `mayContainPersonalData` (posts carry
 *    usernames). Per COMPLIANCE we extract only themes/polarity from it and
 *    store no individual-level data; revisit before adding more social sources.
 */
export const saasPack: IndustryPack = {
  id: "saas",
  label: "B2B SaaS",
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
    // --- Public community sentiment → buyer complaints/praise ---
    {
      id: "saas-reddit-saas",
      label: "r/SaaS (public feed)",
      kind: "social_public",
      adapter: "rss-news",
      url: "https://www.reddit.com/r/SaaS/.rss",
      mayContainPersonalData: true,
      extractAs: ["sentiment_theme"],
    },
  ],
  kpis: [
    {
      id: "share_of_voice",
      label: "Share of voice",
      aggregation: "share_of_voice",
      entityKind: "market_event",
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
        "Extract a software company's name, domain, one-sentence positioning, listed pricing tiers, and named features from the provided text. JSON keys: name, domain, positioning, pricingTiers[], features[].",
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
