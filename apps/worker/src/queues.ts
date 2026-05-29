import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/** The pipeline is three stages, each its own queue, chained by the processors. */
export const scrapeQueue = new Queue("scrape", { connection });
export const extractQueue = new Queue("extract", { connection });
export const digestQueue = new Queue("digest", { connection });

export interface ScrapeJob {
  industryId: string;
  sourceId: string;
}
export interface ExtractJob {
  industryId: string;
  rawRecordId: string;
}
export interface DigestJob {
  industryId: string;
  periodStart: string;
  periodEnd: string;
}
