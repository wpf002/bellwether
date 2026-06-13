import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import { renderDigestPdf, type WeeklyDigest } from "@bellwether/digest";

/**
 * Loads the most recent persisted digest for an industry, resolves every cited
 * raw-record id to its source URL, renders a PDF, and writes it to ./out.
 * Returns the output path.
 */
export async function renderLatestDigest(industryId: string, outDir = "out"): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.digests)
    .where(eq(schema.digests.industryId, industryId))
    .orderBy(desc(schema.digests.createdAt))
    .limit(1);
  if (!row) throw new Error(`No digest found for "${industryId}" — run a digest job first.`);

  const digest = row.body as WeeklyDigest;
  const citedIds = [...digest.keyPlayers, ...digest.whatChanged, ...digest.buyerComplaints].flatMap(
    (f) => f.sourceRecordIds,
  );

  const sourceUrls: Record<string, string> = {};
  if (citedIds.length > 0) {
    const records = await db
      .select({ id: schema.rawRecords.id, url: schema.rawRecords.url })
      .from(schema.rawRecords)
      .where(inArray(schema.rawRecords.id, citedIds));
    for (const r of records) if (r.url) sourceUrls[r.id] = r.url;
  }

  const pdf = await renderDigestPdf(digest, { sourceUrls });
  await mkdir(outDir, { recursive: true });
  const path = resolve(outDir, `digest-${industryId}-${row.id}.pdf`);
  await writeFile(path, pdf);
  return path;
}

// CLI: `node dist/render.js <industryId>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const industryId = process.argv[2];
  const run = async () => {
    if (!industryId) {
      console.error("Usage: render <industryId>");
      process.exitCode = 1;
      return;
    }
    const path = await renderLatestDigest(industryId);
    console.log(`Wrote ${path}`);
  };
  void run();
}
