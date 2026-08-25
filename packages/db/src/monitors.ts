import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Database } from "./client.js";
import { schema } from "./index.js";

export interface MonitorRow {
  id: string;
  orgId: string | null;
  name: string;
  domain: string | null;
  description: string | null;
  industryId: string | null;
  createdAt: string;
}

export interface CompetitorRow {
  id: string;
  monitorId: string;
  name: string;
  domain: string | null;
}

export interface MonitorSourceRow {
  id: string;
  monitorId: string;
  label: string;
  kind: string;
  adapter: string;
  url: string;
  extractAs: string[];
  createdAt: string;
}

export interface MonitorDetail extends MonitorRow {
  competitors: CompetitorRow[];
  sources: MonitorSourceRow[];
}

export async function listMonitors(db: Database, orgId?: string): Promise<MonitorRow[]> {
  const rows = orgId
    ? await db
        .select()
        .from(schema.monitors)
        .where(eq(schema.monitors.orgId, orgId))
        .orderBy(schema.monitors.createdAt)
    : await db.select().from(schema.monitors).orderBy(schema.monitors.createdAt);
  return rows.map(toMonitorRow);
}

export async function getMonitor(db: Database, id: string): Promise<MonitorDetail | null> {
  const rows = await db
    .select()
    .from(schema.monitors)
    .where(eq(schema.monitors.id, id));
  if (!rows[0]) return null;

  const [competitors, sources] = await Promise.all([
    db.select().from(schema.monitorCompetitors).where(eq(schema.monitorCompetitors.monitorId, id)),
    db.select().from(schema.monitorSources).where(eq(schema.monitorSources.monitorId, id)),
  ]);

  return {
    ...toMonitorRow(rows[0]),
    competitors: competitors.map((c) => ({ ...c })),
    sources: sources.map((s) => ({
      ...s,
      extractAs: (s.extractAs as string[]) ?? ["market_event", "company"],
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export async function createMonitor(
  db: Database,
  input: { orgId?: string; name: string; domain?: string; description?: string; industryId?: string },
): Promise<MonitorRow> {
  const id = randomUUID();
  const [row] = await db
    .insert(schema.monitors)
    .values({ id, orgId: input.orgId ?? null, name: input.name, domain: input.domain ?? null, description: input.description ?? null, industryId: input.industryId ?? null })
    .returning();
  return toMonitorRow(row!);
}

export async function updateMonitor(
  db: Database,
  id: string,
  patch: { name?: string; domain?: string; description?: string; industryId?: string },
): Promise<MonitorRow | null> {
  const rows = await db
    .update(schema.monitors)
    .set({ name: patch.name, domain: patch.domain ?? undefined, description: patch.description ?? undefined, industryId: patch.industryId ?? undefined })
    .where(eq(schema.monitors.id, id))
    .returning();
  return rows[0] ? toMonitorRow(rows[0]) : null;
}

export async function deleteMonitor(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(schema.monitors).where(eq(schema.monitors.id, id)).returning();
  return rows.length > 0;
}

// ---- competitors ----

export async function addCompetitor(
  db: Database,
  monitorId: string,
  input: { name: string; domain?: string },
): Promise<CompetitorRow> {
  const id = randomUUID();
  const [row] = await db
    .insert(schema.monitorCompetitors)
    .values({ id, monitorId, name: input.name, domain: input.domain ?? null })
    .returning();
  return row!;
}

export async function removeCompetitor(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(schema.monitorCompetitors).where(eq(schema.monitorCompetitors.id, id)).returning();
  return rows.length > 0;
}

// ---- sources ----

export async function addMonitorSource(
  db: Database,
  monitorId: string,
  input: { label: string; kind: string; adapter: string; url: string; extractAs?: string[] },
): Promise<MonitorSourceRow> {
  const id = randomUUID();
  const extractAs = input.extractAs ?? ["market_event", "company"];
  const [row] = await db
    .insert(schema.monitorSources)
    .values({ id, monitorId, label: input.label, kind: input.kind, adapter: input.adapter, url: input.url, extractAs })
    .returning();
  return {
    ...row!,
    extractAs: (row!.extractAs as string[]),
    createdAt: row!.createdAt.toISOString(),
  };
}

export async function removeMonitorSource(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(schema.monitorSources).where(eq(schema.monitorSources.id, id)).returning();
  return rows.length > 0;
}

/**
 * Returns signals scoped to a monitor:
 * 1. Signals from custom monitor sources (by source_id prefix in raw_records)
 * 2. Company/event signals from base industry where name matches monitored entity or competitors
 */
export async function monitorSignals(
  db: Database,
  monitor: MonitorDetail,
  opts: { limit?: number; offset?: number; kind?: string } = {},
): Promise<{ signals: unknown[]; total: number }> {
  const { limit = 50, offset = 0 } = opts;

  // Build name list: monitored company + competitors (lowercase for matching)
  const names = [monitor.name, ...monitor.competitors.map((c) => c.name)].map((n) =>
    n.toLowerCase(),
  );

  // Source-id prefix for monitor-specific sources
  const sourcePrefix = `ms-${monitor.id}-`;

  const kindFilter = opts.kind ? sql`AND s.entity_kind = ${opts.kind}` : sql``;

  const rows = await db.execute(sql`
    SELECT DISTINCT s.*
    FROM signals s
    WHERE (
      -- Signals from user-defined monitor sources
      EXISTS (
        SELECT 1 FROM raw_records rr
        WHERE rr.source_id LIKE ${sourcePrefix + "%"}
          AND s.source_record_ids::jsonb @> to_jsonb(ARRAY[rr.id]::text[])
      )
      -- OR company-name match in base industry signals
      OR (
        s.industry_id = ${monitor.industryId}
        AND (
          lower(s.payload->>'name') = ANY(${names})
          OR lower(s.payload->>'company') = ANY(${names})
        )
      )
    )
    ${kindFilter}
    ORDER BY s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countRow = await db.execute(sql`
    SELECT count(DISTINCT s.id)::int AS n
    FROM signals s
    WHERE (
      EXISTS (
        SELECT 1 FROM raw_records rr
        WHERE rr.source_id LIKE ${sourcePrefix + "%"}
          AND s.source_record_ids::jsonb @> to_jsonb(ARRAY[rr.id]::text[])
      )
      OR (
        s.industry_id = ${monitor.industryId}
        AND (
          lower(s.payload->>'name') = ANY(${names})
          OR lower(s.payload->>'company') = ANY(${names})
        )
      )
    )
    ${kindFilter}
  `);

  const resultRows = (rows as unknown as { rows?: unknown[] }).rows ?? (rows as unknown[]);
  const countRows = (countRow as unknown as { rows?: { n: number }[] }).rows ?? [];
  const total = (countRows[0] as { n: number } | undefined)?.n ?? 0;

  return { signals: resultRows, total };
}

// ---- helpers ----

function toMonitorRow(r: typeof schema.monitors.$inferSelect): MonitorRow {
  return {
    id: r.id,
    orgId: r.orgId,
    name: r.name,
    domain: r.domain,
    description: r.description,
    industryId: r.industryId,
    createdAt: r.createdAt.toISOString(),
  };
}
