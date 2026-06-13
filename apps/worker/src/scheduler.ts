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

/**
 * Registers weekly repeatable jobs (idempotent by scheduler id): a scrape per
 * source on Monday 06:00, and a rolling-7-day digest on Monday 09:00 — after the
 * scrape→extract fan-out has had time to settle. The worker processes them on
 * schedule as long as it's running. Re-running this updates the schedule in place.
 */
export async function scheduleWeekly(industryId: string): Promise<void> {
  const pack = getIndustryPack(industryId);
  for (const source of pack.sources) {
    await scrapeQueue.upsertJobScheduler(
      `weekly-scrape-${pack.id}-${source.id}`,
      { pattern: "0 6 * * 1" },
      { name: "scrape", data: { industryId: pack.id, sourceId: source.id } },
    );
  }
  await digestQueue.upsertJobScheduler(
    `weekly-digest-${pack.id}`,
    { pattern: "0 9 * * 1" },
    { name: "digest", data: { industryId: pack.id, rollingDays: 7 } },
  );
}

// CLI: scrape <industryId> [sourceId...] | digest <industryId> <startISO> <endISO> | schedule-weekly <industryId>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, industryId, start, end] = process.argv.slice(2);
  const run = async () => {
    if (command === "scrape" && industryId) {
      const sourceIds = process.argv.slice(4);
      const n = await enqueuePackScrapes(industryId, sourceIds);
      console.log(`Enqueued ${n} scrape jobs for "${industryId}".`);
    } else if (command === "digest" && industryId && start && end) {
      await enqueueDigest(industryId, start, end);
      console.log(`Enqueued digest for "${industryId}" ${start}..${end}.`);
    } else if (command === "schedule-weekly" && industryId) {
      await scheduleWeekly(industryId);
      console.log(`Registered weekly scrape + digest schedulers for "${industryId}".`);
    } else {
      console.error(
        "Usage:\n  scheduler scrape <industryId> [sourceId...]\n" +
          "  scheduler digest <industryId> <startISO> <endISO>\n" +
          "  scheduler schedule-weekly <industryId>",
      );
      process.exitCode = 1;
    }
    await connection.quit();
  };
  void run();
}
