import { getIndustryPack, listIndustryPacks } from "@bellwether/industries";
import { scrapeQueue, digestQueue, connection } from "./queues.js";

/** Cron patterns by cadence. Scrape at 06:00, digest at 09:00 (after the
 *  scrape→extract fan-out settles). Daily is the default in prod so the
 *  time-series surfaces (momentum, trends, pricing-change detection) fill in. */
const CADENCE = {
  daily: { scrape: "0 6 * * *", digest: "0 9 * * *" },
  weekly: { scrape: "0 6 * * 1", digest: "0 9 * * 1" },
} as const;
export type Cadence = keyof typeof CADENCE;

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
 * Registers repeatable jobs for ONE industry (idempotent by scheduler id): a
 * scrape per source, and a rolling-7-day digest, on the given cadence. The
 * worker processes them on schedule as long as it's running. Re-running updates
 * the schedule in place. Scheduler ids are cadence-agnostic so switching cadence
 * replaces (not duplicates) the existing jobs.
 */
export async function scheduleIndustry(
  industryId: string,
  cadence: Cadence = "daily",
): Promise<number> {
  const pack = getIndustryPack(industryId);
  const pat = CADENCE[cadence];
  for (const source of pack.sources) {
    await scrapeQueue.upsertJobScheduler(
      `scrape-${pack.id}-${source.id}`,
      { pattern: pat.scrape },
      { name: "scrape", data: { industryId: pack.id, sourceId: source.id } },
    );
  }
  await digestQueue.upsertJobScheduler(
    `digest-${pack.id}`,
    { pattern: pat.digest },
    { name: "digest", data: { industryId: pack.id, rollingDays: 7 } },
  );
  return pack.sources.length;
}

/** Back-compat alias — registers one industry on the weekly cadence. */
export async function scheduleWeekly(industryId: string): Promise<void> {
  await scheduleIndustry(industryId, "weekly");
}

/**
 * Registers repeatable scrape+digest jobs for EVERY industry in the catalog —
 * the "let it cook" switch. Run once after deploy (against prod Redis); the
 * always-on worker then keeps all 20 verticals fresh on the chosen cadence.
 */
export async function scheduleAll(cadence: Cadence = "daily"): Promise<number> {
  const packs = listIndustryPacks();
  let sources = 0;
  for (const pack of packs) sources += await scheduleIndustry(pack.id, cadence);
  return packs.length;
}

// CLI: scrape <industryId> [sourceId...] | digest <industryId> <startISO> <endISO>
//      | schedule <industryId> [daily|weekly] | schedule-all [daily|weekly]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, arg1, arg2, arg3] = process.argv.slice(2);
  const asCadence = (v: string | undefined): Cadence => (v === "weekly" ? "weekly" : "daily");
  const run = async () => {
    if (command === "scrape" && arg1) {
      const sourceIds = process.argv.slice(4);
      const n = await enqueuePackScrapes(arg1, sourceIds);
      console.log(`Enqueued ${n} scrape jobs for "${arg1}".`);
    } else if (command === "digest" && arg1 && arg2 && arg3) {
      await enqueueDigest(arg1, arg2, arg3);
      console.log(`Enqueued digest for "${arg1}" ${arg2}..${arg3}.`);
    } else if ((command === "schedule" || command === "schedule-weekly") && arg1) {
      const cadence = command === "schedule-weekly" ? "weekly" : asCadence(arg2);
      const n = await scheduleIndustry(arg1, cadence);
      console.log(`Registered ${cadence} schedulers for "${arg1}" (${n} sources + digest).`);
    } else if (command === "schedule-all") {
      const cadence = asCadence(arg1);
      const n = await scheduleAll(cadence);
      console.log(`Registered ${cadence} scrape + digest schedulers for all ${n} industries.`);
    } else {
      console.error(
        "Usage:\n  scheduler scrape <industryId> [sourceId...]\n" +
          "  scheduler digest <industryId> <startISO> <endISO>\n" +
          "  scheduler schedule <industryId> [daily|weekly]\n" +
          "  scheduler schedule-all [daily|weekly]",
      );
      process.exitCode = 1;
    }
    await connection.quit();
  };
  void run();
}
