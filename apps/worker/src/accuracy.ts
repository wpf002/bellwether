import { sql, eq } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import { toPlainText } from "./processors/text.js";

export interface AuditRow {
  signalId: string;
  entityKind: string;
  payload: Record<string, unknown>;
  sourceId: string;
  sourceUrl: string | null;
  rawExcerpt: string;
}

/**
 * Samples signals and pairs each with the source text it was extracted from, so
 * a human can spot-check that the extraction is faithful (the Phase 1 accuracy
 * harness). This is verification, not scoring — it just surfaces signal vs.
 * source side by side.
 */
export async function sampleSignalsForAudit(industryId: string, n = 10): Promise<AuditRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      signalId: schema.signals.id,
      entityKind: schema.signals.entityKind,
      payload: schema.signals.payload,
      sourceRecordIds: schema.signals.sourceRecordIds,
    })
    .from(schema.signals)
    .where(eq(schema.signals.industryId, industryId))
    .orderBy(sql`random()`)
    .limit(n);

  const out: AuditRow[] = [];
  for (const r of rows) {
    const rawId = (r.sourceRecordIds as string[])[0];
    let sourceUrl: string | null = null;
    let rawExcerpt = "";
    if (rawId) {
      const [rec] = await db
        .select({ url: schema.rawRecords.url, raw: schema.rawRecords.raw })
        .from(schema.rawRecords)
        .where(eq(schema.rawRecords.id, rawId));
      if (rec) {
        sourceUrl = rec.url;
        rawExcerpt = toPlainText(rec.raw).slice(0, 280);
      }
    }
    out.push({
      signalId: r.signalId,
      entityKind: r.entityKind,
      payload: r.payload as Record<string, unknown>,
      sourceId: rawId ?? "(none)",
      sourceUrl,
      rawExcerpt,
    });
  }
  return out;
}

/** Renders audit rows as a readable text report — pure, so it's unit-testable. */
export function formatAuditReport(rows: AuditRow[]): string {
  if (rows.length === 0) return "No signals to audit.";
  const blocks = rows.map((r, i) => {
    return [
      `#${i + 1}  [${r.entityKind}]  signal ${r.signalId}`,
      `  extracted: ${JSON.stringify(r.payload)}`,
      `  source:    ${r.sourceUrl ?? r.sourceId}`,
      `  raw text:  ${r.rawExcerpt}`,
    ].join("\n");
  });
  return `Accuracy spot-check — ${rows.length} signal(s)\n\n${blocks.join("\n\n")}`;
}

// CLI: `node dist/accuracy.js <industryId> [n]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const industryId = process.argv[2];
  const n = Number(process.argv[3] ?? 10);
  const run = async () => {
    if (!industryId) {
      console.error("Usage: accuracy <industryId> [n]");
      process.exitCode = 1;
      return;
    }
    console.log(formatAuditReport(await sampleSignalsForAudit(industryId, n)));
    process.exit(0);
  };
  void run();
}
