import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";
import {
  extractStructured,
  extractionSchemas,
  isExtractionEmpty,
  CompanyListExtraction,
} from "@bellwether/extract";
import type { ExtractJob } from "../queues.js";
import { toPlainText } from "./text.js";
import { buildExtractedSignal } from "./signal.js";

/**
 * For a raw record, run the pack's extraction prompt for each entity kind the
 * source is scoped to (`SourceDef.extractAs`, defaulting to the pack's full
 * set). The LLM only ever extracts here — no scoring, ranking, or prediction.
 *
 * `company` extraction pulls EVERY company named in the record (one signal each)
 * so coverage isn't capped at one company per article; other kinds yield a
 * single signal. A failed/empty extraction is logged and skipped, not fatal.
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

  const persist = (entityKind: (typeof kinds)[number], payload: Record<string, unknown>) =>
    buildExtractedSignal({
      id: randomUUID(),
      industryId: pack.id,
      entityKind,
      payload,
      rawRecordId: record.id,
      sourceId: source.id,
      createdAt: new Date().toISOString(),
    }).then((signal) =>
      db
        .insert(schema.signals)
        .values({
          id: signal.id,
          industryId: signal.industryId,
          entityKind: signal.entityKind,
          payload: signal.payload,
          sourceRecordIds: signal.sourceRecordIds,
          lineage: signal.lineage,
        })
        .onConflictDoNothing(),
    );

  for (const kind of kinds) {
    const prompt = pack.prompts.find((p) => p.entityKind === kind);
    if (!prompt) continue;

    try {
      if (kind === "company") {
        // Multi-company: every org named in the record becomes its own signal.
        const result = await extractStructured({ prompt, text, schema: CompanyListExtraction });
        for (const company of result.companies ?? []) {
          const payload = company as Record<string, unknown>;
          if (isExtractionEmpty("company", payload)) continue;
          await persist("company", payload);
        }
      } else {
        const schemaForKind = extractionSchemas[kind];
        if (!schemaForKind) continue;
        const payload = (await extractStructured({
          prompt,
          text,
          schema: schemaForKind,
        })) as Record<string, unknown>;
        if (isExtractionEmpty(kind, payload)) continue;
        await persist(kind, payload);
      }
    } catch (err) {
      console.warn(
        `[extract] ${record.id} (${kind}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
