import type { IndustryPack } from "@bellwether/core";
import { EVENT_KIND_GUIDE } from "./catalog.js";

/**
 * Second vertical (Phase 2): e-commerce / retail. The point of this pack is to
 * prove the engine generalizes with ZERO per-industry code — it reuses the same
 * entity kinds (company / market_event / sentiment_theme), extraction schemas,
 * adapter, and pipeline as the SaaS pack. Only config differs: sources, prompts,
 * and KPIs.
 *
 * Sources are robots-permitted RSS/Atom feeds (verified): retail-trade news,
 * one first-party retailer newsroom, and a Hacker News discussion feed for
 * shopper/merchant sentiment. `extractAs` scopes each.
 */
export const ecommercePack: IndustryPack = {
  id: "ecommerce",
  label: "E-commerce & Retail",
  version: "0.1.0",
  description:
    "Market intelligence for online retail: who's moving, what's launching, pricing and channel shifts, and shopper/merchant sentiment.",
  entityKinds: ["company", "sentiment_theme", "market_event"],
  sources: [
    // --- Retail/commerce trade news → market events ---
    {
      id: "ecom-retaildive",
      label: "Retail Dive",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.retaildive.com/feeds/news/",
      mayContainPersonalData: false,
      extractAs: ["market_event", "company"],
    },
    {
      id: "ecom-modernretail",
      label: "Modern Retail",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.modernretail.co/feed/",
      mayContainPersonalData: false,
      extractAs: ["market_event", "company"],
    },
    {
      id: "ecom-dc360",
      label: "Digital Commerce 360",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.digitalcommerce360.com/feed/",
      mayContainPersonalData: false,
      extractAs: ["market_event", "company"],
    },
    {
      id: "ecom-glossy",
      label: "Glossy",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.glossy.co/feed/",
      mayContainPersonalData: false,
      extractAs: ["market_event", "company"],
    },
    {
      id: "ecom-grocerydive",
      label: "Grocery Dive",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.grocerydive.com/feeds/news/",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "ecom-restaurantdive",
      label: "Restaurant Dive",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.restaurantdive.com/feeds/news/",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    // --- News with company profiles → company + market events ---
    {
      id: "ecom-techcrunch",
      label: "TechCrunch — E-commerce",
      kind: "rss",
      adapter: "rss-news",
      url: "https://techcrunch.com/tag/e-commerce/feed/",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    {
      id: "ecom-amazon",
      label: "About Amazon — Retail",
      kind: "rss",
      adapter: "rss-news",
      url: "https://www.aboutamazon.com/news/retail/feed",
      mayContainPersonalData: false,
      extractAs: ["company", "market_event"],
    },
    // --- Public community sentiment → shopper/merchant gripes & praise ---
    {
      id: "ecom-hn-discussion",
      label: "Hacker News — e-commerce discussion",
      kind: "social_public",
      adapter: "rss-news",
      url: "https://hnrss.org/newest?q=ecommerce&points=5",
      mayContainPersonalData: true,
      extractAs: ["sentiment_theme"],
    },
  ],
  kpis: [
    {
      id: "share_of_voice",
      label: "Most Mentioned",
      aggregation: "share_of_voice",
      entityKind: "company",
      field: "name",
    },
    {
      id: "negative_themes",
      label: "Top Shopper/Merchant Complaints",
      aggregation: "count",
      entityKind: "sentiment_theme",
      field: "polarity",
    },
    {
      id: "channel_moves",
      label: "Channel & Pricing Moves (30d)",
      aggregation: "count",
      entityKind: "market_event",
      field: "kind",
    },
  ],
  prompts: [
    {
      id: "ecom-company",
      entityKind: "company",
      system:
        'Extract EVERY retail/e-commerce company named in the text as an array — brands, retailers, marketplaces, or commerce-platform vendors. A company is NOT a product, campaign, event, or funding round. Return { "companies": [ { "name", "domain", "positioning", "pricingTiers": [], "features": [] } ] } — one entry per distinct company. Use the company\'s own name, not a product\'s. Empty array if none.',
    },
    {
      id: "ecom-sentiment",
      entityKind: "sentiment_theme",
      system:
        "Extract one recurring shopper- or merchant-sentiment theme and its polarity (positive|neutral|negative) from the discussion text. Do not weight or score importance. JSON keys: theme, polarity.",
    },
    {
      id: "ecom-event",
      entityKind: "market_event",
      system: `Classify the retail/e-commerce text as ONE market event. Pick the SINGLE best kind: ${EVENT_KIND_GUIDE} Store openings/closures and channel/marketplace moves count as expansion; otherwise use "other" ONLY when nothing fits. JSON keys: kind, headline, occurredAt (the date it happened if stated, else null).`,
    },
  ],
};
