import type { SourceDef } from "@bellwether/core";
import { SourceAdapter } from "../source-adapter.js";

/**
 * Reduces an HTML page to readable text — strips scripts/styles/markup, decodes
 * entities, collapses whitespace, and bounds length. Pure + unit-testable.
 *
 * Captures the readable text (not raw markup) as the provenance unit; the source
 * URL is the citation pointer. Hashing the cleaned text means a pricing/feature
 * change on the page produces a new record — useful for detecting movement.
 */
export function extractReadableText(html: string, maxChars = 16000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

/**
 * Server-rendered HTML adapter (Phase 4 follow-on): one record per page, the
 * page's readable text. Crawl etiquette + retry are enforced by the base
 * `SourceAdapter`. Client-rendered (SPA) pages return little text on a plain
 * fetch and need the deferred Playwright/managed fetcher — this adapter targets
 * server-rendered pages (e.g. many vendor pricing pages).
 */
export class HtmlPageAdapter extends SourceAdapter {
  readonly id = "html-page";

  protected parse(source: SourceDef, body: string) {
    const text = extractReadableText(body);
    if (!text) return [];
    return [{ url: source.url, raw: text }];
  }
}
