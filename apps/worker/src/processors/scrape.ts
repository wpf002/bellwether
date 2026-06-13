import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@bellwether/db";
import { getAdapter, ScrapeError } from "@bellwether/scrapers";
import { getIndustryPack } from "@bellwether/industries";
import { extractQueue, type ScrapeJob, type ExtractJob } from "../queues.js";
import { ensurePackPersisted } from "../seed.js";
import { selectNewRecords } from "./dedupe.js";

/**
 * Fetch a source via its adapter (crawl etiquette + retry/backoff enforced in
 * the adapter base), dedupe on `(sourceId, contentHash)`, persist new raw
 * records, and enqueue one extract job per new record. Records per-source health
 * either way so a dead source surfaces in monitoring instead of rotting silently.
 */
export async function processScrape(job: ScrapeJob): Promise<void> {
  const pack = getIndustryPack(job.industryId);
  const source = pack.sources.find((s) => s.id === job.sourceId);
  if (!source) throw new Error(`Source ${job.sourceId} not found in pack ${job.industryId}`);

  const db = getDb();
  await ensurePackPersisted(db, pack);

  const ctx = {
    userAgent: process.env.SCRAPER_USER_AGENT ?? "BellwetherBot/0.1 (+https://example.com/bot)",
    defaultRateLimitMs: Number(process.env.SCRAPER_DEFAULT_RATE_LIMIT_MS ?? 2000),
    maxItems: Number(process.env.SCRAPER_MAX_ITEMS ?? 25),
    maxRetries: Number(process.env.SCRAPER_MAX_RETRIES ?? 3),
  };

  let fetched;
  try {
    fetched = await getAdapter(source.adapter).fetch(source, ctx);
  } catch (err) {
    const status = err instanceof ScrapeError ? (err.status ?? null) : null;
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.sources)
      .set({
        lastFetchedAt: new Date(),
        healthy: 0,
        consecutiveFailures: sql`${schema.sources.consecutiveFailures} + 1`,
        lastError: message.slice(0, 500),
        lastStatus: status,
      })
      .where(eq(schema.sources.id, source.id));
    console.error(`[scrape] ${source.id} FAILED: ${message}`);
    throw err;
  }

  const existing = await db
    .select({ contentHash: schema.rawRecords.contentHash })
    .from(schema.rawRecords)
    .where(eq(schema.rawRecords.sourceId, source.id));
  const fresh = selectNewRecords(
    fetched,
    existing.map((e) => e.contentHash),
  );

  if (fresh.length > 0) {
    await db
      .insert(schema.rawRecords)
      .values(
        fresh.map((r) => ({
          id: r.id,
          sourceId: r.sourceId,
          url: r.url,
          fetchedAt: new Date(r.fetchedAt),
          contentHash: r.contentHash,
          raw: r.raw,
        })),
      )
      .onConflictDoNothing();

    for (const r of fresh) {
      await extractQueue.add("extract", {
        industryId: pack.id,
        rawRecordId: r.id,
      } satisfies ExtractJob);
    }
  }

  const now = new Date();
  await db
    .update(schema.sources)
    .set({
      lastFetchedAt: now,
      lastSuccessAt: now,
      healthy: 1,
      consecutiveFailures: 0,
      lastError: null,
      lastStatus: 200,
    })
    .where(eq(schema.sources.id, source.id));

  console.log(`[scrape] ${source.id}: ${fetched.length} fetched, ${fresh.length} new`);
}
