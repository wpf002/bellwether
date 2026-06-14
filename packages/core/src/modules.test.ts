import { describe, expect, it } from "vitest";
import type { Signal } from "./signal.js";
import { opportunityMap, regulatoryEvents } from "./modules.js";

function sig(over: Partial<Signal> & Pick<Signal, "entityKind" | "payload">): Signal {
  return {
    id: over.id ?? "s",
    industryId: "saas",
    sourceRecordIds: over.sourceRecordIds ?? ["r"],
    lineage: [],
    createdAt: over.createdAt ?? "2026-06-13T00:00:00.000Z",
    ...over,
  };
}

describe("opportunityMap", () => {
  const signals: Signal[] = [
    sig({
      id: "a",
      entityKind: "sentiment_theme",
      payload: { theme: "pricing too high", polarity: "negative" },
      sourceRecordIds: ["r1"],
    }),
    sig({
      id: "b",
      entityKind: "sentiment_theme",
      payload: { theme: "Pricing too high", polarity: "negative" },
      sourceRecordIds: ["r2"],
    }),
    sig({
      id: "c",
      entityKind: "sentiment_theme",
      payload: { theme: "great support", polarity: "positive" },
      sourceRecordIds: ["r3"],
    }),
    sig({ id: "d", entityKind: "company", payload: { name: "Acme" } }),
  ];

  it("clusters negative themes into opportunities (case-insensitive) with citations", () => {
    const map = opportunityMap(signals);
    expect(map.opportunities).toHaveLength(1);
    expect(map.opportunities[0]).toMatchObject({ theme: "pricing too high", mentions: 2 });
    expect(map.opportunities[0]?.sourceRecordIds.sort()).toEqual(["r1", "r2"]);
  });

  it("surfaces positive themes as strengths and ignores non-sentiment signals", () => {
    const map = opportunityMap(signals);
    expect(map.strengths.map((s) => s.theme)).toEqual(["great support"]);
  });
});

describe("regulatoryEvents", () => {
  it("returns only regulatory market events, newest first, with citations", () => {
    const events = regulatoryEvents([
      sig({
        id: "e1",
        entityKind: "market_event",
        payload: { kind: "regulatory", headline: "New rule" },
        sourceRecordIds: ["r9"],
        createdAt: "2026-06-10T00:00:00.000Z",
      }),
      sig({
        id: "e2",
        entityKind: "market_event",
        payload: { kind: "funding", headline: "Round" },
      }),
      sig({
        id: "e3",
        entityKind: "market_event",
        payload: { kind: "regulatory", headline: "Newer rule" },
        createdAt: "2026-06-12T00:00:00.000Z",
      }),
    ]);
    expect(events.map((e) => e.signalId)).toEqual(["e3", "e1"]); // newest first, non-reg dropped
    expect(events[1]?.sourceRecordIds).toEqual(["r9"]);
  });
});
