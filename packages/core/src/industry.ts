import { z } from "zod";

/**
 * IndustryPack — the config-driven engine.
 *
 * The entire "choose an industry and the platform pivots" thesis lives here.
 * An IndustryPack is pure declarative config: which sources to watch, which
 * entities/KPIs matter, and which extraction prompts to use. NO per-industry
 * code branches anywhere else in the platform. Phase 2 success criterion:
 * adding a new vertical = authoring one pack, no engine changes.
 */

export const SourceKind = z.enum(["rss", "html", "json_api", "review_site", "social_public"]);
export type SourceKind = z.infer<typeof SourceKind>;

export const SourceDef = z.object({
  id: z.string(),
  label: z.string(),
  kind: SourceKind,
  /** Adapter id in @bellwether/scrapers that knows how to fetch this. */
  adapter: z.string(),
  url: z.string(),
  /** Per-source override of the global crawl etiquette. */
  rateLimitMs: z.number().int().positive().optional(),
  /** If true, this source may contain personal data — handle per COMPLIANCE. */
  mayContainPersonalData: z.boolean().default(false),
});
export type SourceDef = z.infer<typeof SourceDef>;

export const KpiDef = z.object({
  id: z.string(),
  label: z.string(),
  /** How the KPI is computed from signals. Declarative, never a model call. */
  aggregation: z.enum(["count", "mean", "min", "max", "latest", "share_of_voice"]),
  entityKind: z.enum(["company", "sentiment_theme", "market_event"]),
  field: z.string().optional(),
});
export type KpiDef = z.infer<typeof KpiDef>;

export const ExtractionPrompt = z.object({
  id: z.string(),
  entityKind: z.enum(["company", "sentiment_theme", "market_event"]),
  /** System prompt steering structured extraction. Output is JSON only. */
  system: z.string(),
});
export type ExtractionPrompt = z.infer<typeof ExtractionPrompt>;

export const IndustryPack = z.object({
  id: z.string(), // e.g. "saas"
  label: z.string(), // e.g. "B2B SaaS"
  description: z.string(),
  /** The curated source list — the part that takes real domain knowledge. */
  sources: z.array(SourceDef).min(1),
  /** Which entities this vertical tracks. */
  entityKinds: z.array(z.enum(["company", "sentiment_theme", "market_event"])).min(1),
  /** Vertical-specific KPIs surfaced on the dashboard. */
  kpis: z.array(KpiDef),
  /** Extraction prompts, one per tracked entity kind. */
  prompts: z.array(ExtractionPrompt),
});
export type IndustryPack = z.infer<typeof IndustryPack>;

/** Validate a pack at load time. Throws with a readable error on bad config. */
export function parseIndustryPack(input: unknown): IndustryPack {
  return IndustryPack.parse(input);
}
