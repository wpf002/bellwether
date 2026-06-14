import { describe, expect, it } from "vitest";
import { computeQuality } from "./quality.js";

describe("computeQuality", () => {
  it("reports citation rate, coverage, useful rate, and by-kind counts", () => {
    const m = computeQuality({
      signals: [
        { entityKind: "company", sourceRecordIds: ["r1"] },
        { entityKind: "market_event", sourceRecordIds: ["r2"] },
        { entityKind: "market_event", sourceRecordIds: ["r3"] },
      ],
      sources: [{ healthy: true }, { healthy: true }, { healthy: false }],
      feedback: [{ kind: "useful" }, { kind: "useful" }, { kind: "not_useful" }, { kind: "acted" }],
    });
    expect(m.signalCount).toBe(3);
    expect(m.citationRate).toBe(1);
    expect(m.coverage).toBeCloseTo(2 / 3);
    expect(m.usefulRate).toBeCloseTo(2 / 3);
    expect(m.actedCount).toBe(1);
    expect(m.byKind).toEqual({ company: 1, market_event: 2 });
  });

  it("flags an uncited signal in the citation rate", () => {
    const m = computeQuality({
      signals: [
        { entityKind: "company", sourceRecordIds: ["r1"] },
        { entityKind: "company", sourceRecordIds: [] },
      ],
      sources: [],
      feedback: [],
    });
    expect(m.citationRate).toBe(0.5);
    expect(m.coverage).toBe(0);
  });

  it("returns null useful rate when there is no useful/not_useful feedback", () => {
    const m = computeQuality({
      signals: [{ entityKind: "company", sourceRecordIds: ["r"] }],
      sources: [{ healthy: true }],
      feedback: [{ kind: "acted" }],
    });
    expect(m.usefulRate).toBeNull();
    expect(m.citationRate).toBe(1);
  });
});
