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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
