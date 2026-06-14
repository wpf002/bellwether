import { describe, expect, it } from "vitest";
import { extractReadableText, HtmlPageAdapter } from "./html-page.js";

const HTML = `<!doctype html><html><head>
<style>.x{color:red}</style>
<script>var pricing = "secret"; console.log(1)</script>
</head><body>
<!-- comment -->
<h1>Pricing</h1>
<p>Pro plan: $20&nbsp;/ user / month. Includes&nbsp;SSO &amp; audit logs.</p>
</body></html>`;

describe("extractReadableText", () => {
  it("strips scripts, styles, comments, and tags", () => {
    const text = extractReadableText(HTML);
    expect(text).toContain("Pricing");
    expect(text).toContain("Pro plan: $20");
    expect(text).toContain("SSO & audit logs");
    expect(text).not.toContain("secret"); // script contents gone
    expect(text).not.toContain("color:red"); // style contents gone
    expect(text).not.toContain("<");
  });

  it("bounds output length", () => {
    expect(extractReadableText(`<p>${"x".repeat(50000)}</p>`, 1000).length).toBe(1000);
  });

  it("collapses to empty for a blank page", () => {
    expect(extractReadableText("<html><body></body></html>")).toBe("");
  });
});

describe("HtmlPageAdapter", () => {
  const adapter = new HtmlPageAdapter() as unknown as {
    parse: (s: { url: string }, body: string) => Array<{ url: string | null; raw: string }>;
  };

  it("emits one record per page with the page URL", () => {
    const records = adapter.parse({ url: "https://x.com/pricing" }, HTML);
    expect(records).toHaveLength(1);
    expect(records[0]?.url).toBe("https://x.com/pricing");
    expect(records[0]?.raw).toContain("Pro plan: $20");
  });

  it("emits nothing for an empty page", () => {
    expect(adapter.parse({ url: "https://x.com" }, "<html></html>")).toEqual([]);
  });
});
