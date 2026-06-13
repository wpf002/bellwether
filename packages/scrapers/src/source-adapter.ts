import { createHash, randomUUID } from "node:crypto";
import type { RawRecord, SourceDef } from "@bellwether/core";
import { isAllowed } from "./robots.js";

export interface FetchContext {
  userAgent: string;
  defaultRateLimitMs: number;
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
      throw new Error(`robots.txt disallows fetching ${source.url} for ${ctx.userAgent}`);
    }

    await sleep(source.rateLimitMs ?? ctx.defaultRateLimitMs);

    const res = await fetch(source.url, { headers: { "user-agent": ctx.userAgent } });
    if (!res.ok) throw new Error(`fetch failed ${res.status} for ${source.url}`);
    const body = await res.text();

    const now = new Date().toISOString();
    return this.parse(source, body).map((item) => ({
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
