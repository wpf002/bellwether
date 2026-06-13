import { describe, expect, it } from "vitest";
import { toPlainText } from "./text.js";

describe("toPlainText", () => {
  it("pulls title + description and strips tags", () => {
    const raw =
      "<item><title>New launch</title><description>We shipped &amp; tested it</description></item>";
    const text = toPlainText(raw);
    expect(text).toContain("New launch");
    expect(text).toContain("We shipped");
    expect(text).not.toContain("<");
  });

  it("unwraps CDATA sections", () => {
    const raw =
      "<item><title><![CDATA[Big & bold]]></title><description><![CDATA[<p>body</p>]]></description></item>";
    const text = toPlainText(raw);
    expect(text).toContain("Big & bold");
    expect(text).toContain("body");
    expect(text).not.toContain("CDATA");
  });

  it("handles Atom summary/content fields", () => {
    const raw = "<entry><title>Atom</title><summary>the summary</summary></entry>";
    expect(toPlainText(raw)).toContain("the summary");
  });

  it("bounds output length", () => {
    const raw = `<item><title>t</title><description>${"x".repeat(20000)}</description></item>`;
    expect(toPlainText(raw).length).toBeLessThanOrEqual(8000);
  });

  it("falls back to the whole block when no known fields are present", () => {
    expect(toPlainText("<item><guid>abc-123</guid></item>")).toContain("abc-123");
  });
});
