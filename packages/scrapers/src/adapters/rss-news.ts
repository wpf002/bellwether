import type { SourceDef } from "@bellwether/core";
import { SourceAdapter } from "../source-adapter.js";

/**
 * Parses RSS `<item>` and Atom `<entry>` blocks out of a feed body, returning
 * one record per entry with its canonical link.
 *
 * Dependency-light on purpose (Phase 1): a real XML parser is a hardening-phase
 * swap. Kept as a free function so it's unit-testable without the network/fetch
 * machinery in the base adapter.
 */
export function parseRssItems(body: string): Array<{ url: string | null; raw: string }> {
  const items: Array<{ url: string | null; raw: string }> = [];
  const blocks = body.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  for (const block of blocks) {
    // Atom prefers <link rel="alternate" href="...">; fall back to any href,
    // then to RSS's <link>text</link>.
    const url =
      block.match(/<link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i)?.[1] ??
      block.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i)?.[1] ??
      block.match(/<link>\s*([\s\S]*?)\s*<\/link>/i)?.[1] ??
      null;
    items.push({ url: url ? url.trim() : null, raw: block.trim() });
  }
  return items;
}

/**
 * Minimal RSS/Atom adapter. Crawl etiquette (robots.txt + rate limiting) is
 * enforced by the base `SourceAdapter`, not here.
 */
export class RssNewsAdapter extends SourceAdapter {
  readonly id = "rss-news";

  protected parse(_source: SourceDef, body: string) {
    return parseRssItems(body);
  }
}
