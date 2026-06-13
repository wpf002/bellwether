import { createHash, randomUUID } from "node:crypto";
import type { RawRecord, SourceDef } from "@bellwether/core";
import { isAllowed } from "./robots.js";
import { fetchTextWithRetry, ScrapeError } from "./fetch.js";

export interface FetchContext {
  userAgent: string;
  defaultRateLimitMs: number;
  /** Cap on records kept per fetch — keeps a weekly digest from ingesting a
   *  feed's full archive. Undefined = no cap. */
  maxItems?: number;
  /** Transient-failure retry budget (network/429/5xx). Default 3. */
  maxRetries?: number;
}

/**
 * Base class for every source adapter. Crawl etiquette (robots.txt + rate
 * limiting) is enforced here so no individual adapter can skip it. Subclasses
 * implement only `parse()`.
 */
export abstract class SourceAdapter {
  abstract readonly id: string;

  /** Turn fetched text into zero or more raw records. */
  protected abstract parse(
    source: SourceDef,
    body: string,
  ): Array<{ url: string | null; raw: string }>;

  async fetch(source: SourceDef, ctx: FetchContext): Promise<RawRecord[]> {
    const allowed = await isAllowed(source.url, ctx.userAgent);
    if (!allowed) {
      throw new ScrapeError(
        `robots.txt disallows fetching ${source.url} for ${ctx.userAgent}`,
        403,
        false,
      );
    }

    await sleep(source.rateLimitMs ?? ctx.defaultRateLimitMs);

    const body = await fetchTextWithRetry(
      source.url,
      { headers: { "user-agent": ctx.userAgent } },
      { maxRetries: ctx.maxRetries },
    );

    const now = new Date().toISOString();
    const cap = source.maxItems ?? ctx.maxItems; // per-source override wins
    const parsed = this.parse(source, body);
    const items = cap ? parsed.slice(0, cap) : parsed;
    return items.map((item) => ({
      id: randomUUID(),
      sourceId: source.id,
      url: item.url,
      fetchedAt: now,
      contentHash: createHash("sha256").update(item.raw).digest("hex"),
      raw: item.raw,
    }));
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
