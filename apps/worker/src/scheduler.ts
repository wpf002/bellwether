import { getIndustryPack } from "@bellwether/industries";
import { scrapeQueue, digestQueue, connection } from "./queues.js";

/**
 * Enqueues one scrape job per source in a pack. This is the entry point a weekly
 * cron triggers; the scrape → extract → digest fan-out happens downstream in the
 * worker. (Wiring this to a BullMQ repeatable job is a small follow-up; for now
 * it's invoked on demand / by an external scheduler.)
 */
export async function enqueuePackScrapes(
  industryId: string,
  sourceIds?: string[],
): Promise<number> {
  const pack = getIndustryPack(industryId);
  const sources = sourceIds?.length
    ? pack.sources.filter((s) => sourceIds.includes(s.id))
    : pack.sources;
  for (const source of sources) {
    await scrapeQueue.add("scrape", { industryId: pack.id, sourceId: source.id });
  }
  return sources.length;
}

/**
 * Enqueues a digest job covering the [periodStart, periodEnd] window. Run after a
 * scrape cycle has had time to flow through extraction.
 */
export async function enqueueDigest(
  industryId: string,
  periodStart: string,
  periodEnd: string,
): Promise<void> {
  const pack = getIndustryPack(industryId);
  await digestQueue.add("digest", { industryId: pack.id, periodStart, periodEnd });
}

// CLI: `node dist/scheduler.js scrape <industryId>` | `digest <industryId> <startISO> <endISO>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, industryId, start, end] = process.argv.slice(2);
  const run = async () => {
    if (command === "scrape" && industryId) {
      const sourceIds = process.argv.slice(4); // scrape <industryId> [sourceId...]
      const n = await enqueuePackScrapes(industryId, sourceIds);
      console.log(`Enqueued ${n} scrape jobs for "${industryId}".`);
    } else if (command === "digest" && industryId && start && end) {
      await enqueueDigest(industryId, start, end);
      console.log(`Enqueued digest for "${industryId}" ${start}..${end}.`);
    } else {
      console.error(
        "Usage:\n  scheduler scrape <industryId>\n  scheduler digest <industryId> <startISO> <endISO>",
      );
      process.exitCode = 1;
    }
    await connection.quit();
  };
  void run();
}
