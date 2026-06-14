import { describe, expect, it } from "vitest";
import type { IndustryPack, Signal } from "@bellwether/core";
import { buildWeeklyDigest, assertCited } from "./weekly-digest.js";

// Minimal stand-in: buildWeeklyDigest reads pack.id and pack.kpis. Keeps the
// test from depending on the industries package.
const pack = {
  id: "saas",
  kpis: [
    { id: "events", label: "Market events", aggregation: "count", entityKind: "market_event" },
    {
      id: "complaints",
      label: "Complaints by polarity",
      aggregation: "count",
      entityKind: "sentiment_theme",
      field: "polarity",
    },
  ],
} as unknown as IndustryPack;

function signal(overrides: Partial<Signal> & Pick<Signal, "entityKind" | "payload">): Signal {
  return {
    id: overrides.id ?? "sig",
    industryId: "saas",
    sourceRecordIds: overrides.sourceRecordIds ?? ["raw_1"],
    lineage: [],
    createdAt: "2026-06-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildWeeklyDigest", () => {
  const signals: Signal[] = [
    signal({
      id: "c1",
      entityKind: "company",
      payload: { name: "Stripe" },
      sourceRecordIds: ["raw_a"],
    }),
    signal({
      id: "e1",
      entityKind: "market_event",
      payload: { headline: "Figma raises round" },
      sourceRecordIds: ["raw_b"],
    }),
    signal({
      id: "s1",
      entityKind: "sentiment_theme",
      payload: { theme: "pricing too high", polarity: "negative" },
      sourceRecordIds: ["raw_c"],
    }),
    signal({
      id: "s2",
      entityKind: "sentiment_theme",
      payload: { theme: "great support", polarity: "positive" },
    }),
  ];

  const digest = buildWeeklyDigest({
    pack,
    signals,
    periodStart: "2026-06-07T00:00:00.000Z",
    periodEnd: "2026-06-13T23:59:59.000Z",
  });

  it("partitions signals into the three digest sections", () => {
    expect(digest.keyPlayers.map((f) => f.signalId)).toEqual(["c1"]);
    expect(digest.whatChanged.map((f) => f.signalId)).toEqual(["e1"]);
    // Only negative sentiment is a buyer complaint.
    expect(digest.buyerComplaints.map((f) => f.signalId)).toEqual(["s1"]);
  });

  it("carries source record ids into every finding (the citation layer)", () => {
    expect(digest.keyPlayers[0]?.sourceRecordIds).toEqual(["raw_a"]);
    expect(digest.whatChanged[0]?.sourceRecordIds).toEqual(["raw_b"]);
    expect(digest.buyerComplaints[0]?.sourceRecordIds).toEqual(["raw_c"]);
  });

  it("surfaces payload fields in the human-readable claim", () => {
    expect(digest.keyPlayers[0]?.claim).toContain("Stripe");
    expect(digest.whatChanged[0]?.claim).toContain("Figma raises round");
    expect(digest.buyerComplaints[0]?.claim).toContain("pricing too high");
  });

  it("echoes the requested period and industry", () => {
    expect(digest.industryId).toBe("saas");
    expect(digest.periodStart).toBe("2026-06-07T00:00:00.000Z");
  });

  it("computes the pack's declarative KPIs over the signals", () => {
    const events = digest.kpis.find((k) => k.id === "events");
    expect(events?.value).toBe(1); // one market_event signal
    const complaints = digest.kpis.find((k) => k.id === "complaints");
    // count grouped by polarity: 1 negative, 1 positive
    expect(complaints?.value).toEqual({ negative: 1, positive: 1 });
  });

  it("every finding is cited (built digest passes the citation gate)", () => {
    expect(() => assertCited(digest)).not.toThrow();
  });
});

describe("assertCited", () => {
  it("throws on an uncited finding", () => {
    expect(() =>
      assertCited({
        industryId: "saas",
        periodStart: "",
        periodEnd: "",
        kpis: [],
        keyPlayers: [{ claim: "uncited", sourceRecordIds: [], signalId: "x" }],
        whatChanged: [],
        buyerComplaints: [],
        generatedAt: "",
      }),
    ).toThrow(/Uncited finding/);
  });
});
