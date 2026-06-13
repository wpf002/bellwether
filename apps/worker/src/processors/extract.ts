import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";
import { extractStructured, extractionSchemas, isExtractionEmpty } from "@bellwether/extract";
import type { ExtractJob } from "../queues.js";
import { toPlainText } from "./text.js";
import { buildExtractedSignal } from "./signal.js";

/**
 * For a raw record, run the pack's extraction prompt for each entity kind the
 * source is scoped to (`SourceDef.extractAs`, defaulting to the pack's full
 * set). Each successful extraction becomes a Signal with full lineage. The LLM
 * only ever extracts here — no scoring, ranking, or prediction.
 *
 * An extraction that fails (no parseable output / a kind the record doesn't
 * support) is logged and skipped, not fatal: one record can legitimately yield
 * a market_event but no company.
 */
export async function processExtract(job: ExtractJob): Promise<void> {
  const pack = getIndustryPack(job.industryId);
  const db = getDb();

  const [record] = await db
    .select()
    .from(schema.rawRecords)
    .where(eq(schema.rawRecords.id, job.rawRecordId));
  if (!record) throw new Error(`Raw record ${job.rawRecordId} not found`);

  const source = pack.sources.find((s) => s.id === record.sourceId);
  if (!source) throw new Error(`Source ${record.sourceId} not found in pack ${pack.id}`);

  const kinds = source.extractAs ?? pack.entityKinds;
  const text = toPlainText(record.raw);

  for (const kind of kinds) {
    const prompt = pack.prompts.find((p) => p.entityKind === kind);
    const schemaForKind = extractionSchemas[kind];
    if (!prompt || !schemaForKind) continue;

    let payload: Record<string, unknown>;
    try {
      payload = (await extractStructured({ prompt, text, schema: schemaForKind })) as Record<
        string,
        unknown
      >;
    } catch (err) {
      console.warn(
        `[extract] ${record.id} (${kind}): ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }

    // The model declined — no entity of this kind in the record. Don't persist junk.
    if (isExtractionEmpty(kind, payload)) continue;

    const signal = await buildExtractedSignal({
      id: randomUUID(),
      industryId: pack.id,
      entityKind: kind,
      payload,
      rawRecordId: record.id,
      sourceId: source.id,
      createdAt: new Date().toISOString(),
    });

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
  }
}
