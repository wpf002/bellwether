import type { IndustryPack } from "@bellwether/core";

/**
 * The reference pack. Phase 1 goes embarrassingly deep on this ONE vertical
 * before any second pack is added. Sources here are illustrative placeholders —
 * replace with the real curated list (the part that takes domain knowledge).
 */
export const saasPack: IndustryPack = {
  id: "saas",
  label: "B2B SaaS",
  description:
    "Competitive and market intelligence for B2B software: positioning, pricing, feature movement, and buyer sentiment.",
  entityKinds: ["company", "sentiment_theme", "market_event"],
  sources: [
    {
      id: "saas-techcrunch",
      label: "Industry news (RSS)",
      kind: "rss",
      adapter: "rss-news",
      url: "https://techcrunch.com/feed/",
      mayContainPersonalData: false,
    },
    // Phase 1: add ~10-15 real sources here (competitor pricing pages, review
    // sites via their TOS-permitted routes, relevant subreddits' public RSS).
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
        "Extract recurring buyer-sentiment themes and their polarity (positive|neutral|negative) from review/forum text. Do not weight or score importance. JSON keys: theme, polarity.",
    },
    {
      id: "saas-event",
      entityKind: "market_event",
      system:
        "Extract market events (product_launch|pricing_change|funding|acquisition|leadership_change|regulatory|campaign|other) with a headline and occurredAt if stated. JSON keys: kind, headline, occurredAt.",
    },
  ],
};
