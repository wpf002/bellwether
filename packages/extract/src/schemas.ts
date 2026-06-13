// zod/v4 entrypoint: the SDK's `zodOutputFormat` runs `z.toJSONSchema()` from
// zod v4 over these schemas, so they must be authored with the v4 API. (Core's
// domain schemas stay on the classic `zod` import — the two coexist in 3.25.x.)
import { z } from "zod/v4";
import type { EntityKind } from "@bellwether/core";

/**
 * Extraction schemas — the typed shape the LLM must return for each entity kind.
 *
 * These mirror the JSON keys documented in each pack's extraction prompt and are
 * intentionally looser than the canonical `@bellwether/core` entity schemas:
 * they omit fields the platform assigns downstream (ids, `supportCount`,
 * `companyId`, quote ids) and relax formats (e.g. `occurredAt` is a plain
 * nullable string, not a strict datetime) so a real-world model response
 * validates instead of being rejected on a formatting technicality.
 *
 * Extraction is only trusted if it parses against one of these — see
 * `extractStructured`, which enforces the schema via structured outputs.
 */

export const CompanyExtraction = z.object({
  name: z.string(),
  domain: z.string().nullable(),
  positioning: z.string().nullable(),
  pricingTiers: z
    .array(
      z.object({
        name: z.string(),
        monthlyUsd: z.number().nullable(),
        annualUsd: z.number().nullable(),
        unit: z.string().nullable(),
      }),
    )
    .default([]),
  features: z.array(z.string()).default([]),
});
export type CompanyExtraction = z.infer<typeof CompanyExtraction>;

export const SentimentExtraction = z.object({
  theme: z.string(),
  polarity: z.enum(["positive", "neutral", "negative"]),
});
export type SentimentExtraction = z.infer<typeof SentimentExtraction>;

export const MarketEventExtraction = z.object({
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
  occurredAt: z.string().nullable(),
});
export type MarketEventExtraction = z.infer<typeof MarketEventExtraction>;

/** One extraction schema per entity kind, keyed for the worker's extract step. */
export const extractionSchemas: Record<EntityKind, z.ZodType> = {
  company: CompanyExtraction,
  sentiment_theme: SentimentExtraction,
  market_event: MarketEventExtraction,
};
