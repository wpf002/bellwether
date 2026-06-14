import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";
import {
  diffPricing,
  runChain,
  withLineage,
  type PricingTierLike,
  type Signal,
} from "@bellwether/core";

/**
 * Turns pricing movement into market events. For each HTML pricing source, diffs
 * the two most recent `company` snapshots' pricing tiers; if they differ, emits
 * a deterministic `pricing_change` market event cited to BOTH snapshots. The LLM
 * extracted the tiers; this code decides whether pricing moved (invariant intact).
 */
export async function detectPricingChanges(industryId: string): Promise<number> {
  const pack = getIndustryPack(industryId);
  const db = getDb();
  const htmlSources = new Set(
    pack.sources.filter((s) => s.adapter === "html-page").map((s) => s.id),
  );
  if (htmlSources.size === 0) return 0;

  const companySignals = await db
    .select({
      id: schema.signals.id,
      payload: schema.signals.payload,
      sourceRecordIds: schema.signals.sourceRecordIds,
      createdAt: schema.signals.createdAt,
    })
    .from(schema.signals)
    .where(and(eq(schema.signals.industryId, industryId), eq(schema.signals.entityKind, "company")))
    .orderBy(desc(schema.signals.createdAt));

  const firstRecordId = (s: { sourceRecordIds: unknown }) =>
    (s.sourceRecordIds as string[])[0] ?? "";
  const recIds = [...new Set(companySignals.map(firstRecordId).filter(Boolean))];
  const recs = recIds.length
    ? await db
        .select({ id: schema.rawRecords.id, sourceId: schema.rawRecords.sourceId })
        .from(schema.rawRecords)
        .where(inArray(schema.rawRecords.id, recIds))
    : [];
  const sourceOf = new Map(recs.map((r) => [r.id, r.sourceId]));

  // Group company snapshots by their (HTML pricing) source, newest first.
  const bySource = new Map<string, typeof companySignals>();
  for (const sig of companySignals) {
    const sid = sourceOf.get(firstRecordId(sig));
    if (!sid || !htmlSources.has(sid)) continue;
    const list = bySource.get(sid) ?? [];
    list.push(sig);
    bySource.set(sid, list);
  }

  let emitted = 0;
  for (const snaps of bySource.values()) {
    if (snaps.length < 2) continue;
    const [latest, prev] = snaps;
    if (!latest || !prev) continue;
    const latestPayload = latest.payload as Record<string, unknown>;
    const prevPayload = prev.payload as Record<string, unknown>;
    const change = diffPricing(
      (prevPayload.pricingTiers as PricingTierLike[]) ?? [],
      (latestPayload.pricingTiers as PricingTierLike[]) ?? [],
    );
    if (!change) continue;

    const latestRec = firstRecordId(latest);
    const prevRec = firstRecordId(prev);
    const seed: Signal = {
      id: `pricing-${latestRec}`, // stable → re-runs dedupe via onConflictDoNothing
      industryId,
      entityKind: "market_event",
      payload: {
        kind: "pricing_change",
        headline: `${String(latestPayload.name ?? "Vendor")} pricing changed: ${change}`,
        occurredAt: null,
      },
      sourceRecordIds: [latestRec, prevRec], // cite both snapshots
      lineage: [],
      createdAt: new Date().toISOString(),
    };
    const signal = await runChain(seed, [
      {
        name: "detect.pricing_change",
        apply: (s) => withLineage(s, "detect.pricing_change", {}, { change }),
      },
    ]);

    await db
      .insert(schema.signals)
      .values({
        id: signal.id,
        industryId: signal.industryId,
        entityKind: signal.entityKind,
        payload: signal.payload,
        sourceRecordIds: signal.sourceRecordIds,
        lineage: signal.lineage,
      })
      .onConflictDoNothing();
    emitted += 1;
  }
  return emitted;
}

// CLI: `node dist/detect-pricing.js <industryId>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const industryId = process.argv[2];
  const run = async () => {
    if (!industryId) {
      console.error("Usage: detect-pricing <industryId>");
      process.exitCode = 1;
      return;
    }
    const n = await detectPricingChanges(industryId);
    console.log(`[detect-pricing] ${industryId}: ${n} pricing_change event(s) emitted`);
    process.exit(0);
  };
  void run();
}
