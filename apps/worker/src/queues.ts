import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
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
  /** Explicit window. If omitted, the processor uses a rolling window. */
  periodStart?: string;
  periodEnd?: string;
  /** Rolling window length (days) when periodStart/End are omitted. Default 7. */
  rollingDays?: number;
}
