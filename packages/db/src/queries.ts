import { eq, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import * as schema from "./schema.js";

export interface SourceHealth {
  id: string;
  label: string;
  url: string;
  healthy: boolean;
  lastSuccessAt: string | null;
  lastFetchedAt: string | null;
  lastError: string | null;
  lastStatus: number | null;
  consecutiveFailures: number;
  /** Hours since the last successful fetch (null if never succeeded). */
  stalenessHours: number | null;
  /** True if no success within the staleness budget. */
  stale: boolean;
  /** Raw records ever captured from this source. */
  recordCount: number;
}

/**
 * Per-source health + freshness for an industry. Surfaces dead/stale sources so
 * collection failures page someone instead of silently rotting the product
 * (Phase 4). `staleHours` is the freshness budget (default 8 days — looser than
 * the weekly cadence).
 */
export async function sourceHealth(
  db: Database,
  industryId: string,
  staleHours = 192,
): Promise<SourceHealth[]> {
  const rows = await db
    .select({
      id: schema.sources.id,
      label: schema.sources.label,
      url: schema.sources.url,
      healthy: schema.sources.healthy,
      lastSuccessAt: schema.sources.lastSuccessAt,
      lastFetchedAt: schema.sources.lastFetchedAt,
      lastError: schema.sources.lastError,
      lastStatus: schema.sources.lastStatus,
      consecutiveFailures: schema.sources.consecutiveFailures,
      recordCount: sql<number>`count(${schema.rawRecords.id})::int`,
    })
    .from(schema.sources)
    .leftJoin(schema.rawRecords, eq(schema.rawRecords.sourceId, schema.sources.id))
    .where(eq(schema.sources.industryId, industryId))
    .groupBy(schema.sources.id);

  const now = Date.now();
  return rows.map((r) => {
    const stalenessHours =
      r.lastSuccessAt == null ? null : (now - r.lastSuccessAt.getTime()) / 3_600_000;
    return {
      id: r.id,
      label: r.label,
      url: r.url,
      healthy: r.healthy === 1,
      lastSuccessAt: r.lastSuccessAt?.toISOString() ?? null,
      lastFetchedAt: r.lastFetchedAt?.toISOString() ?? null,
      lastError: r.lastError,
      lastStatus: r.lastStatus,
      consecutiveFailures: r.consecutiveFailures,
      stalenessHours: stalenessHours == null ? null : Math.round(stalenessHours * 10) / 10,
      stale: stalenessHours == null || stalenessHours > staleHours,
      recordCount: Number(r.recordCount),
    };
  });
}

/** Sources needing attention — failing or stale. */
export function unhealthySources(health: SourceHealth[]): SourceHealth[] {
  return health.filter((s) => !s.healthy || s.stale);
}
