import type { ScrapeJob } from "../queues.js";

/**
 * Phase 1: fetch a source via its adapter, dedupe by content hash, persist raw
 * records, and enqueue an extract job per new record. Wired to
 * @bellwether/scrapers (etiquette enforced there) and @bellwether/db.
 *
 * TODO(Phase 1): implement persistence + enqueue. Skeleton kept thin on purpose
 * so the architecture is reviewable before the wiring lands.
 */
export async function processScrape(job: ScrapeJob): Promise<void> {
  void job;
  // 1. const pack = getIndustryPack(job.industryId)
  // 2. const source = pack.sources.find(s => s.id === job.sourceId)
  // 3. const records = await getAdapter(source.adapter).fetch(source, ctx)
  // 4. insert new (dedupe on sourceId+contentHash) -> extractQueue.add per record
}
