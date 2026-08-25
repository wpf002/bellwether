/**
 * Thin queue client for the API — lets the API enqueue scrape/digest jobs into
 * the same BullMQ queues the worker consumes, without importing from apps/worker.
 * Both sides point at the same Redis instance via REDIS_URL.
 */
import { Queue } from "bullmq";
import { Redis } from "ioredis";

let _conn: Redis | null = null;

function getConnection(): Redis {
  if (!_conn) {
    _conn = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return _conn;
}

let _scrapeQueue: Queue | null = null;

export function getScrapeQueue(): Queue {
  if (!_scrapeQueue) {
    _scrapeQueue = new Queue("scrape", { connection: getConnection() });
  }
  return _scrapeQueue;
}

export async function closeQueueClient(): Promise<void> {
  if (_scrapeQueue) { await _scrapeQueue.close(); _scrapeQueue = null; }
  if (_conn) { await _conn.quit(); _conn = null; }
}
