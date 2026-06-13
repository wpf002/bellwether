import { describe, expect, it } from "vitest";
import type { Signal } from "./signal.js";
import type { KpiDef } from "./industry.js";
import { computeKpi } from "./kpi.js";

function sig(entityKind: Signal["entityKind"], payload: Record<string, unknown>, id = "s"): Signal {
  return {
    id,
    industryId: "saas",
    entityKind,
    payload,
    sourceRecordIds: ["raw"],
    lineage: [],
    createdAt: "2026-06-13T00:00:00.000Z",
  };
}

const def = (over: Partial<KpiDef> & Pick<KpiDef, "aggregation" | "entityKind">): KpiDef => ({
  id: "k",
  label: "K",
  ...over,
});

describe("computeKpi", () => {
  const signals: Signal[] = [
    sig("market_event", { kind: "funding" }, "e1"),
    sig("market_event", { kind: "funding" }, "e2"),
    sig("market_event", { kind: "acquisition" }, "e3"),
    sig("company", { name: "Stripe", employees: 8000 }, "c1"),
    sig("company", { name: "Figma", employees: 1500 }, "c2"),
  ];

  it("count without a field totals signals of the kind", () => {
    expect(
      computeKpi(def({ aggregation: "count", entityKind: "market_event" }), signals).value,
    ).toBe(3);
  });

  it("count with a field groups by that field", () => {
    expect(
      computeKpi(def({ aggregation: "count", entityKind: "market_event", field: "kind" }), signals)
        .value,
    ).toEqual({ funding: 2, acquisition: 1 });
  });

  it("share_of_voice returns fractions that sum to 1", () => {
    const value = computeKpi(
      def({ aggregation: "share_of_voice", entityKind: "market_event", field: "kind" }),
      signals,
    ).value as Record<string, number>;
    expect(value.funding).toBeCloseTo(2 / 3);
    expect(value.acquisition).toBeCloseTo(1 / 3);
    expect(Object.values(value).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("mean/min/max operate on a numeric field", () => {
    expect(
      computeKpi(def({ aggregation: "mean", entityKind: "company", field: "employees" }), signals)
        .value,
    ).toBe(4750);
    expect(
      computeKpi(def({ aggregation: "min", entityKind: "company", field: "employees" }), signals)
        .value,
    ).toBe(1500);
    expect(
      computeKpi(def({ aggregation: "max", entityKind: "company", field: "employees" }), signals)
        .value,
    ).toBe(8000);
  });

  it("returns null for numeric aggregations with no data", () => {
    expect(
      computeKpi(def({ aggregation: "mean", entityKind: "sentiment_theme", field: "x" }), signals)
        .value,
    ).toBeNull();
  });

  it("latest returns the field of the most recent signal", () => {
    const recent = [
      sig("market_event", { headline: "old" }, "a"),
      { ...sig("market_event", { headline: "new" }, "b"), createdAt: "2026-06-20T00:00:00.000Z" },
    ];
    expect(
      computeKpi(
        def({ aggregation: "latest", entityKind: "market_event", field: "headline" }),
        recent,
      ).value,
    ).toBe("new");
  });
});
