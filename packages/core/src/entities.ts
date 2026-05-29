import { z } from "zod";

/**
 * The marketing-intelligence entity schema.
 *
 * This is deliberately a SUPERSET that every industry pack narrows or extends.
 * Phase 2 (the industry-config layer) is what makes these generic across
 * verticals: a pack declares which entities and fields it cares about and how
 * to populate them. See packages/industries.
 */

export const PricingTier = z.object({
  name: z.string(),
  monthlyUsd: z.number().nonnegative().nullable(),
  annualUsd: z.number().nonnegative().nullable(),
  unit: z.string().nullable(), // e.g. "per seat", "per 1k events"
  highlights: z.array(z.string()).default([]),
});
export type PricingTier = z.infer<typeof PricingTier>;

export const Company = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string().nullable(),
  description: z.string().nullable(),
  positioning: z.string().nullable(), // how they frame themselves
  pricingTiers: z.array(PricingTier).default([]),
  features: z.array(z.string()).default([]),
});
export type Company = z.infer<typeof Company>;

export const SentimentTheme = z.object({
  theme: z.string(), // e.g. "onboarding friction", "pricing complaints"
  polarity: z.enum(["positive", "neutral", "negative"]),
  /**
   * Frequency is a COUNT of supporting source records, never a model "score".
   * The LLM extracts the theme + polarity; magnitude comes from counting
   * provenance. This keeps judgment out of the model. See COMPLIANCE/README.
   */
  supportCount: z.number().int().nonnegative(),
  exampleQuoteIds: z.array(z.string()).default([]),
});
export type SentimentTheme = z.infer<typeof SentimentTheme>;

export const MarketEvent = z.object({
  id: z.string(),
  kind: z.enum([
    "product_launch",
    "pricing_change",
    "funding",
    "acquisition",
    "leadership_change",
    "regulatory",
    "campaign",
    "other",
  ]),
  headline: z.string(),
  companyId: z.string().nullable(),
  occurredAt: z.string().datetime().nullable(),
});
export type MarketEvent = z.infer<typeof MarketEvent>;

/** Canonical entity union the rest of the platform reasons over. */
export const EntityKind = z.enum(["company", "sentiment_theme", "market_event"]);
export type EntityKind = z.infer<typeof EntityKind>;
