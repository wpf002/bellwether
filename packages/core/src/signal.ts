import { z } from "zod";

/**
 * A Signal is the atomic unit of intelligence in Bellwether.
 *
 * Core invariant (inherited from the Vantage discipline): every Signal carries
 * its FULL provenance and transform history. Nothing in the platform is allowed
 * to assert a fact without a traceable chain back to a raw source record. This
 * is what separates Bellwether from "a feed reader with an LLM bolted on."
 */

/** A raw, unmodified capture from a source. Immutable once stored. */
export const RawRecord = z.object({
  id: z.string(),
  sourceId: z.string(), // which Source produced it (see industries pack)
  url: z.string().url().nullable(),
  fetchedAt: z.string().datetime(),
  contentHash: z.string(), // dedupe + integrity
  raw: z.string(), // verbatim payload (html/text/json)
});
export type RawRecord = z.infer<typeof RawRecord>;

/** One auditable step in a Signal's lineage. */
export const TransformRecord = z.object({
  step: z.string(), // e.g. "extract.entities", "normalize.pricing"
  at: z.string().datetime(),
  /** Free-form, structured detail about what this step did. */
  detail: z.record(z.unknown()).default({}),
});
export type TransformRecord = z.infer<typeof TransformRecord>;

export const Signal = z.object({
  id: z.string(),
  industryId: z.string(),
  entityKind: z.enum(["company", "sentiment_theme", "market_event"]),
  /** The structured payload. Shape depends on entityKind. */
  payload: z.record(z.unknown()),
  /** Provenance: every raw record that contributed to this signal. */
  sourceRecordIds: z.array(z.string()).min(1),
  /** Lineage: ordered transforms applied to get here. */
  lineage: z.array(TransformRecord),
  createdAt: z.string().datetime(),
});
export type Signal = z.infer<typeof Signal>;
