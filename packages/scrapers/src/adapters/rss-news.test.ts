import { describe, expect, it } from "vitest";
import { parseRssItems } from "./rss-news.js";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Example</title>
  <item>
    <title>First post</title>
    <link>https://example.com/first</link>
    <description>Hello world</description>
  </item>
  <item>
    <title>Second post</title>
    <link>https://example.com/second</link>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example</title>
  <entry>
    <title>Atom entry</title>
    <link rel="alternate" href="https://example.com/atom-1"/>
    <summary>Summary here</summary>
  </entry>
  <entry>
    <title>Self-link only</title>
    <link href="https://example.com/atom-2"/>
  </entry>
</feed>`;

describe("parseRssItems", () => {
  it("parses RSS <item> blocks and their links", () => {
    const items = parseRssItems(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]?.url).toBe("https://example.com/first");
    expect(items[1]?.url).toBe("https://example.com/second");
    expect(items[0]?.raw).toContain("First post");
  });

  it("parses Atom <entry> blocks, preferring rel=alternate links", () => {
    const items = parseRssItems(ATOM);
    expect(items).toHaveLength(2);
    expect(items[0]?.url).toBe("https://example.com/atom-1");
    expect(items[1]?.url).toBe("https://example.com/atom-2");
  });

  it("returns an empty array for a feed with no entries", () => {
    expect(parseRssItems("<rss><channel><title>empty</title></channel></rss>")).toEqual([]);
  });

  it("keeps the entry even when no link is present", () => {
    const items = parseRssItems(
      "<rss><channel><item><title>No link</title></item></channel></rss>",
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.url).toBeNull();
  });
});
