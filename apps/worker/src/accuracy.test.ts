import { describe, expect, it } from "vitest";
import { formatAuditReport, type AuditRow } from "./accuracy.js";

const rows: AuditRow[] = [
  {
    signalId: "sig_1",
    entityKind: "market_event",
    payload: { kind: "product_launch", headline: "Acme ships X" },
    sourceId: "raw_1",
    sourceUrl: "https://example.com/x",
    rawExcerpt: "Acme today announced X, a new...",
  },
];

describe("formatAuditReport", () => {
  it("pairs each signal's extraction with its source for human review", () => {
    const report = formatAuditReport(rows);
    expect(report).toContain("[market_event]");
    expect(report).toContain('"headline":"Acme ships X"');
    expect(report).toContain("https://example.com/x");
    expect(report).toContain("Acme today announced X");
  });

  it("handles the empty case", () => {
    expect(formatAuditReport([])).toBe("No signals to audit.");
  });
});
