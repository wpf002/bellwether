import type { SourceDef } from "@bellwether/core";
import { SourceAdapter } from "../source-adapter.js";

interface AlgoliaHit {
  objectID: string;
  title?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
  story_text?: string | null;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function hitToRaw(hit: AlgoliaHit): { url: string | null; raw: string } {
  const title = hit.title ?? "(no title)";
  const link = hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;
  const parts = [`Points: ${hit.points ?? 0}.`];
  if (hit.num_comments) parts.push(`Comments: ${hit.num_comments}.`);
  if (hit.story_text) parts.push(hit.story_text.slice(0, 400));

  const raw = [
    "<item>",
    `  <title>${esc(title)}</title>`,
    `  <link>${link}</link>`,
    `  <pubDate>${hit.created_at ?? ""}</pubDate>`,
    `  <source>Hacker News</source>`,
    `  <description>${esc(parts.join(" "))}</description>`,
    "</item>",
  ].join("\n");

  return { url: link, raw };
}

/**
 * Adapter for the HN Algolia search API (hn.algolia.com).
 * hnrss.org returns 502 from cloud hosting IPs; this API works from anywhere.
 * Returns hits as pseudo-RSS <item> blocks so the extraction pipeline treats
 * them identically to real RSS articles.
 *
 * hn.algolia.com returns 404 for robots.txt → parsed as "allow all" by the
 * base adapter's isAllowed check, so no override needed.
 */
export class HnAlgoliaAdapter extends SourceAdapter {
  readonly id = "hn-algolia";

  protected parse(_source: SourceDef, body: string) {
    const data = JSON.parse(body) as AlgoliaResponse;
    return (data.hits ?? []).map(hitToRaw);
  }
}
