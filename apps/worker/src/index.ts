import { Worker } from "bullmq";
import { connection } from "./queues.js";
import type { ScrapeJob, ExtractJob, DigestJob } from "./queues.js";
import { processScrape } from "./processors/scrape.js";
import { processExtract } from "./processors/extract.js";
import { processDigest } from "./processors/digest.js";
import { sendStatusReport } from "./status-report.js";

const concurrency = Number(process.env.SCRAPER_MAX_CONCURRENCY ?? 2);

const workers = [
  new Worker<ScrapeJob>("scrape", (job) => processScrape(job.data), { connection, concurrency }),
  new Worker<ExtractJob>("extract", (job) => processExtract(job.data), { connection, concurrency }),
  new Worker<DigestJob>("digest", (job) => processDigest(job.data), { connection, concurrency }),
  new Worker("status", () => sendStatusReport(), { connection }),
];

for (const w of workers) {
  w.on("failed", (job, err) => console.error(`[${w.name}] job ${job?.id} failed:`, err.message));
}

console.log("Bellwether worker online (scrape, extract, digest)");

const shutdown = async () => {
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
