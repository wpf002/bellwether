import type { SourceDef } from "@bellwether/core";
import { SourceAdapter } from "../source-adapter.js";

/**
 * Minimal RSS/Atom adapter. Phase 1 deliberately uses dependency-light parsing
 * to keep the vertical slice honest; swap in a real parser when hardening.
 */
export class RssNewsAdapter extends SourceAdapter {
  readonly id = "rss-news";

  protected parse(_source: SourceDef, body: string) {
    const items: Array<{ url: string | null; raw: string }> = [];
    const itemBlocks = body.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    for (const block of itemBlocks) {
      const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? null;
      items.push({ url: link, raw: block });
    }
    return items;
  }
}
