import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { computeQuality, type QualityMetric } from "@bellwether/core";
import type { Database } from "./client.js";
import * as schema from "./schema.js";
import { sourceHealth } from "./queries.js";

export type FeedbackKind = "useful" | "not_useful" | "acted";

export interface RecordFeedbackInput {
  industryId: string;
  kind: FeedbackKind;
  digestId?: string;
  signalId?: string;
  sourceId?: string;
  note?: string;
}

/** Records a user's feedback on a signal/digest — the raw input to the loop. */
export async function recordFeedback(db: Database, input: RecordFeedbackInput): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.feedback).values({
    id,
    industryId: input.industryId,
    digestId: input.digestId ?? null,
    signalId: input.signalId ?? null,
    sourceId: input.sourceId ?? null,
    kind: input.kind,
    note: input.note ?? null,
  });
  return id;
}

/** Feedback tallies for an industry. */
export async function feedbackSummary(
  db: Database,
  industryId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ kind: schema.feedback.kind, n: sql<number>`count(*)::int` })
    .from(schema.feedback)
    .where(eq(schema.feedback.industryId, industryId))
    .groupBy(schema.feedback.kind);
  return Object.fromEntries(rows.map((r) => [r.kind, Number(r.n)]));
}

export interface SourcePriority {
  sourceId: string;
  label: string;
  recordCount: number;
  useful: number;
  notUseful: number;
  /** Higher = prioritize; lower/negative = candidate to drop or re-tune. */
  score: number;
}

/** Pure scoring so prioritization is testable and tunable in one place. */
export function scoreSource(parts: {
  recordCount: number;
  useful: number;
  notUseful: number;
}): number {
  return parts.recordCount + 3 * parts.useful - 3 * parts.notUseful;
}

/**
 * Ranks sources by yield + feedback so a curator knows what to double down on
 * and what to re-tune or drop — closing the loop from feedback to source choice.
 */
export async function sourcePriority(db: Database, industryId: string): Promise<SourcePriority[]> {
  const health = await sourceHealth(db, industryId);
  const fb = await db
    .select({
      sourceId: schema.feedback.sourceId,
      kind: schema.feedback.kind,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.feedback)
    .where(eq(schema.feedback.industryId, industryId))
    .groupBy(schema.feedback.sourceId, schema.feedback.kind);

  const bySource = new Map<string, { useful: number; notUseful: number }>();
  for (const row of fb) {
    if (!row.sourceId) continue;
    const e = bySource.get(row.sourceId) ?? { useful: 0, notUseful: 0 };
    if (row.kind === "useful") e.useful += Number(row.n);
    else if (row.kind === "not_useful") e.notUseful += Number(row.n);
    bySource.set(row.sourceId, e);
  }

  return health
    .map((s) => {
      const f = bySource.get(s.id) ?? { useful: 0, notUseful: 0 };
      return {
        sourceId: s.id,
        label: s.label,
        recordCount: s.recordCount,
        useful: f.useful,
        notUseful: f.notUseful,
        score: scoreSource({
          recordCount: s.recordCount,
          useful: f.useful,
          notUseful: f.notUseful,
        }),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Computes the current per-industry quality metric over a rolling window. */
export async function computeQualityNow(
  db: Database,
  industryId: string,
  days = 30,
): Promise<QualityMetric> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const signals = await db
    .select({
      entityKind: schema.signals.entityKind,
      sourceRecordIds: schema.signals.sourceRecordIds,
    })
    .from(schema.signals)
    .where(and(eq(schema.signals.industryId, industryId), gte(schema.signals.createdAt, since)));
  const sources = await db
    .select({ healthy: schema.sources.healthy })
    .from(schema.sources)
    .where(eq(schema.sources.industryId, industryId));
  const fb = await db
    .select({ kind: schema.feedback.kind })
    .from(schema.feedback)
    .where(eq(schema.feedback.industryId, industryId));

  return computeQuality({
    signals: signals.map((s) => ({
      entityKind: s.entityKind as never,
      sourceRecordIds: s.sourceRecordIds as string[],
    })),
    sources: sources.map((s) => ({ healthy: s.healthy === 1 })),
    feedback: fb,
  });
}

/** Persists a quality snapshot so the metric is trendable over time. */
export async function saveQualitySnapshot(
  db: Database,
  industryId: string,
  metric: QualityMetric,
): Promise<void> {
  await db
    .insert(schema.qualitySnapshots)
    .values({ id: randomUUID(), industryId, metrics: metric });
}

export interface QualitySnapshotRow {
  capturedAt: string;
  metrics: QualityMetric;
}

export async function qualityHistory(
  db: Database,
  industryId: string,
  limit = 30,
): Promise<QualitySnapshotRow[]> {
  const rows = await db
    .select()
    .from(schema.qualitySnapshots)
    .where(eq(schema.qualitySnapshots.industryId, industryId))
    .orderBy(desc(schema.qualitySnapshots.capturedAt))
    .limit(limit);
  return rows.map((r) => ({
    capturedAt: r.capturedAt.toISOString(),
    metrics: r.metrics as QualityMetric,
  }));
}

export interface DigestListItem {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  shippedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

/** Lists persisted digests (lightweight — no body) with review status. */
export async function listDigests(db: Database, industryId: string): Promise<DigestListItem[]> {
  const rows = await db
    .select({
      id: schema.digests.id,
      periodStart: schema.digests.periodStart,
      periodEnd: schema.digests.periodEnd,
      status: schema.digests.status,
      shippedAt: schema.digests.shippedAt,
      reviewedBy: schema.digests.reviewedBy,
      createdAt: schema.digests.createdAt,
    })
    .from(schema.digests)
    .where(eq(schema.digests.industryId, industryId))
    .orderBy(desc(schema.digests.createdAt));
  return rows.map((r) => ({
    id: r.id,
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    status: r.status,
    shippedAt: r.shippedAt?.toISOString() ?? null,
    reviewedBy: r.reviewedBy,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Marks a digest reviewed + shipped (the optional human-review gate). */
export async function shipDigest(
  db: Database,
  digestId: string,
  reviewedBy?: string,
): Promise<boolean> {
  const updated = await db
    .update(schema.digests)
    .set({ status: "shipped", shippedAt: new Date(), reviewedBy: reviewedBy ?? null })
    .where(eq(schema.digests.id, digestId))
    .returning({ id: schema.digests.id });
  return updated.length > 0;
}
