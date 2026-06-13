import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import {
  computeKpis,
  type EntityKind,
  type KpiResult,
  type Signal,
  type TransformRecord,
} from "@bellwether/core";
import { getIndustryPack } from "@bellwether/industries";
import { buildWeeklyDigest, type WeeklyDigest } from "@bellwether/digest";

type SignalRow = typeof schema.signals.$inferSelect;

function rowToSignal(r: SignalRow): Signal {
  return {
    id: r.id,
    industryId: r.industryId,
    entityKind: r.entityKind as EntityKind,
    payload: r.payload as Record<string, unknown>,
    sourceRecordIds: r.sourceRecordIds as string[],
    lineage: r.lineage as TransformRecord[],
    createdAt: r.createdAt.toISOString(),
  };
}

function since(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Signals for an industry within the rolling window (newest first). */
export async function signalsInWindow(industryId: string, days: number): Promise<Signal[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.signals)
    .where(
      and(eq(schema.signals.industryId, industryId), gte(schema.signals.createdAt, since(days))),
    )
    .orderBy(desc(schema.signals.createdAt));
  return rows.map(rowToSignal);
}

/** Resolves raw-record ids to their source URLs — the citation layer. */
export async function urlsForRecords(ids: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const db = getDb();
  const rows = await db
    .select({ id: schema.rawRecords.id, url: schema.rawRecords.url })
    .from(schema.rawRecords)
    .where(inArray(schema.rawRecords.id, unique));
  return Object.fromEntries(rows.map((r) => [r.id, r.url]));
}

export interface DigestResponse extends WeeklyDigest {
  /** recordId → source URL, so the UI can link every cited claim. */
  citations: Record<string, string | null>;
}

/** Computes a digest live ("pull a digest") and attaches citation URLs. */
export async function digestForWindow(industryId: string, days: number): Promise<DigestResponse> {
  const pack = getIndustryPack(industryId);
  const signals = await signalsInWindow(industryId, days);
  const end = new Date();
  const digest = buildWeeklyDigest({
    pack,
    signals,
    periodStart: since(days).toISOString(),
    periodEnd: end.toISOString(),
  });
  const citedIds = [...digest.keyPlayers, ...digest.whatChanged, ...digest.buyerComplaints].flatMap(
    (f) => f.sourceRecordIds,
  );
  return { ...digest, citations: await urlsForRecords(citedIds) };
}

export interface EventItem {
  signalId: string;
  kind: string;
  headline: string;
  occurredAt: string | null;
  detectedAt: string;
  url: string | null;
}

/** Market-event change feed (newest first) with source links. */
export async function eventsFeed(industryId: string, limit: number): Promise<EventItem[]> {
  const signals = (await signalsInWindow(industryId, 3650))
    .filter((s) => s.entityKind === "market_event")
    .slice(0, limit);
  const urls = await urlsForRecords(signals.flatMap((s) => s.sourceRecordIds));
  return signals.map((s) => ({
    signalId: s.id,
    kind: String(s.payload.kind ?? "other"),
    headline: String(s.payload.headline ?? "market event"),
    occurredAt: (s.payload.occurredAt as string | null) ?? null,
    detectedAt: s.createdAt,
    url: urls[s.sourceRecordIds[0] ?? ""] ?? null,
  }));
}

export interface CompanyItem {
  name: string;
  mentions: number;
  share: number;
  urls: string[];
}

/** Companies seen in the window, with share-of-voice and source links. */
export async function companiesView(industryId: string, days: number): Promise<CompanyItem[]> {
  const signals = (await signalsInWindow(industryId, days)).filter(
    (s) => s.entityKind === "company",
  );
  const urls = await urlsForRecords(signals.flatMap((s) => s.sourceRecordIds));
  const byName = new Map<string, { mentions: number; urls: Set<string> }>();
  for (const s of signals) {
    const name = String(s.payload.name ?? "").trim();
    if (!name) continue;
    const entry = byName.get(name) ?? { mentions: 0, urls: new Set<string>() };
    entry.mentions += 1;
    for (const id of s.sourceRecordIds) {
      const u = urls[id];
      if (u) entry.urls.add(u);
    }
    byName.set(name, entry);
  }
  const total = [...byName.values()].reduce((a, e) => a + e.mentions, 0) || 1;
  return [...byName.entries()]
    .map(([name, e]) => ({
      name,
      mentions: e.mentions,
      share: e.mentions / total,
      urls: [...e.urls],
    }))
    .sort((a, b) => b.mentions - a.mentions);
}

export interface Overview {
  industryId: string;
  periodStart: string;
  periodEnd: string;
  totals: { companies: number; events: number; complaints: number };
  kpis: KpiResult[];
  narrative: string;
}

/** Market Overview: KPIs + a deterministic narrative (no LLM — counts only, so
 *  every number traces to provenance and the invariant holds). */
export async function overview(industryId: string, days: number): Promise<Overview> {
  const pack = getIndustryPack(industryId);
  const signals = await signalsInWindow(industryId, days);
  const kpis = computeKpis(pack, signals);

  const companies = signals.filter((s) => s.entityKind === "company");
  const events = signals.filter((s) => s.entityKind === "market_event");
  const complaints = signals.filter(
    (s) => s.entityKind === "sentiment_theme" && s.payload.polarity === "negative",
  );

  const eventKinds = new Map<string, number>();
  for (const e of events) {
    const k = String(e.payload.kind ?? "other");
    eventKinds.set(k, (eventKinds.get(k) ?? 0) + 1);
  }
  const topKinds = [...eventKinds.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, n]) => `${k.replace(/_/g, " ")} (${n})`)
    .join(", ");
  const topComplaint = String(complaints[0]?.payload.theme ?? "");

  const narrative =
    `In the last ${days} days, ${pack.label} saw ${events.length} market events` +
    (topKinds ? ` — most commonly ${topKinds}` : "") +
    `, across ${companies.length} company mentions` +
    (topComplaint ? `. Top buyer complaint: "${topComplaint}".` : ".");

  return {
    industryId,
    periodStart: since(days).toISOString(),
    periodEnd: new Date().toISOString(),
    totals: { companies: companies.length, events: events.length, complaints: complaints.length },
    kpis,
    narrative,
  };
}
