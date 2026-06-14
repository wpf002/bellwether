import { describe, expect, it } from "vitest";
import type { Signal } from "./signal.js";
import { filterByCompetitors } from "./scope.js";

const sig = (
  entityKind: Signal["entityKind"],
  payload: Record<string, unknown>,
  id = "s",
): Signal => ({
  id,
  industryId: "saas",
  entityKind,
  payload,
  sourceRecordIds: ["r"],
  lineage: [],
  createdAt: "2026-06-13T00:00:00.000Z",
});

const signals: Signal[] = [
  sig("company", { name: "Stripe" }, "c1"),
  sig("company", { name: "Notion" }, "c2"),
  sig("market_event", { headline: "Stripe launches new billing API" }, "e1"),
  sig("market_event", { headline: "Acme raises a round" }, "e2"),
  sig("sentiment_theme", { theme: "pricing too high", polarity: "negative" }, "s1"),
];

describe("filterByCompetitors", () => {
  it("returns everything for an empty watchlist", () => {
    expect(filterByCompetitors(signals, [])).toHaveLength(5);
  });

  it("keeps matching companies, matching-headline events, and all sentiment", () => {
    const out = filterByCompetitors(signals, ["Stripe"]);
    expect(out.map((s) => s.id).sort()).toEqual(["c1", "e1", "s1"]);
  });

  it("is case-insensitive and supports multiple names", () => {
    const out = filterByCompetitors(signals, ["stripe", "notion"]);
    expect(out.map((s) => s.id)).toContain("c2");
    expect(out.map((s) => s.id)).toContain("c1");
  });
});
