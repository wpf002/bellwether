import { pgTable, text, timestamp, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Storage schema enforces the provenance invariant: signals reference the raw
 * records they came from, and lineage is persisted, not reconstructed. A signal
 * with no source records cannot exist.
 */

export const industries = pgTable("industries", {
  id: text("id").primaryKey(), // matches IndustryPack.id
  label: text("label").notNull(),
  description: text("description").notNull(),
  packVersion: text("pack_version").notNull().default("0.0.0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(), // matches SourceDef.id
    industryId: text("industry_id")
      .notNull()
      .references(() => industries.id),
    label: text("label").notNull(),
    kind: text("kind").notNull(),
    adapter: text("adapter").notNull(),
    url: text("url").notNull(),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    // Phase 4: health & freshness monitoring.
    healthy: integer("healthy").notNull().default(1), // 1 = ok, 0 = failing
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastStatus: integer("last_status"), // HTTP status of the last attempt
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  },
  (t) => ({ byIndustry: index("sources_industry_idx").on(t.industryId) }),
);

export const rawRecords = pgTable(
  "raw_records",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    url: text("url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    contentHash: text("content_hash").notNull(),
    raw: text("raw").notNull(),
  },
  (t) => ({
    bySource: index("raw_source_idx").on(t.sourceId),
    dedupe: uniqueIndex("raw_hash_uq").on(t.sourceId, t.contentHash),
  }),
);

export const signals = pgTable(
  "signals",
  {
    id: text("id").primaryKey(),
    industryId: text("industry_id")
      .notNull()
      .references(() => industries.id),
    entityKind: text("entity_kind").notNull(),
    payload: jsonb("payload").notNull(),
    sourceRecordIds: jsonb("source_record_ids").notNull(), // string[]
    lineage: jsonb("lineage").notNull(), // TransformRecord[]
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byIndustry: index("signals_industry_idx").on(t.industryId),
    byKind: index("signals_kind_idx").on(t.entityKind),
  }),
);

export const digests = pgTable("digests", {
  id: text("id").primaryKey(),
  industryId: text("industry_id")
    .notNull()
    .references(() => industries.id),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  body: jsonb("body").notNull(), // structured digest (see @bellwether/digest)
  // Phase 5: human-review lifecycle. A digest is "draft" until a reviewer ships it.
  status: text("status").notNull().default("draft"), // 'draft' | 'shipped'
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Phase 5 feedback loop: which signals/digests users found useful or acted on.
 * This is the moat — it feeds source prioritization and per-industry quality.
 */
export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    industryId: text("industry_id")
      .notNull()
      .references(() => industries.id),
    digestId: text("digest_id"), // nullable — feedback may target a signal directly
    signalId: text("signal_id"), // nullable
    sourceId: text("source_id"), // denormalized for source prioritization
    kind: text("kind").notNull(), // 'useful' | 'not_useful' | 'acted'
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byIndustry: index("feedback_industry_idx").on(t.industryId) }),
);

/**
 * Per-industry quality snapshots over time. Rows accumulate so the quality
 * metric is measurable as a trend (Phase 5 exit criterion).
 */
export const qualitySnapshots = pgTable(
  "quality_snapshots",
  {
    id: text("id").primaryKey(),
    industryId: text("industry_id")
      .notNull()
      .references(() => industries.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    metrics: jsonb("metrics").notNull(), // QualityMetric (see queries.ts)
  },
  (t) => ({ byIndustry: index("quality_industry_idx").on(t.industryId) }),
);
