import { RssNewsAdapter } from "./adapters/rss-news.js";
import type { SourceAdapter } from "./source-adapter.js";

export { SourceAdapter } from "./source-adapter.js";
export type { FetchContext } from "./source-adapter.js";
export { isAllowed } from "./robots.js";
export { RssNewsAdapter, parseRssItems } from "./adapters/rss-news.js";
export { fetchTextWithRetry, ScrapeError } from "./fetch.js";
export type { RetryConfig } from "./fetch.js";

/** Adapter registry. Industry packs reference adapters by id. */
export const adapterRegistry: Record<string, SourceAdapter> = {
  "rss-news": new RssNewsAdapter(),
};

export function getAdapter(id: string): SourceAdapter {
  const a = adapterRegistry[id];
  if (!a) throw new Error(`Unknown adapter: ${id}`);
  return a;
}
