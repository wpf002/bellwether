import { randomUUID } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";
import { buildWeeklyDigest } from "@bellwether/digest";
import type { EntityKind, Signal, TransformRecord } from "@bellwether/core";
import type { DigestJob } from "../queues.js";

/**
 * Load the period's signals, build the digest deterministically (no LLM — the
 * model already did its one job upstream), and persist it. The digest carries
 * the source-record ids behind every finding, so the citation layer survives
 * into storage. PDF/email rendering is the next Phase 1 step.
 */
export async function processDigest(job: DigestJob): Promise<void> {
  const pack = getIndustryPack(job.industryId);
  const db = getDb();
  // Explicit window if given; otherwise a rolling window ending now.
  const periodEnd = job.periodEnd ? new Date(job.periodEnd) : new Date();
  const periodStart = job.periodStart
    ? new Date(job.periodStart)
    : new Date(periodEnd.getTime() - (job.rollingDays ?? 7) * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(schema.signals)
    .where(
      and(
        eq(schema.signals.industryId, pack.id),
        gte(schema.signals.createdAt, periodStart),
        lte(schema.signals.createdAt, periodEnd),
      ),
    );

  const signals: Signal[] = rows.map((r) => ({
    id: r.id,
    industryId: r.industryId,
    entityKind: r.entityKind as EntityKind,
    payload: r.payload as Record<string, unknown>,
    sourceRecordIds: r.sourceRecordIds as string[],
    lineage: r.lineage as TransformRecord[],
    createdAt: r.createdAt.toISOString(),
  }));

  const digest = buildWeeklyDigest({
    pack,
    signals,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  });

  await db.insert(schema.digests).values({
    id: randomUUID(),
    industryId: pack.id,
    periodStart,
    periodEnd,
    body: digest,
  });

  console.log(
    `[digest] ${pack.id} ${periodStart.toISOString()}..${periodEnd.toISOString()}: ` +
      `${digest.keyPlayers.length} players, ${digest.whatChanged.length} events, ` +
      `${digest.buyerComplaints.length} complaints from ${signals.length} signals`,
  );
}
