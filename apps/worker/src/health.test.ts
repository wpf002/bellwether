import { describe, expect, it } from "vitest";
import type { SourceHealth } from "@bellwether/db";
import { formatHealthReport } from "./health.js";

const s = (over: Partial<SourceHealth>): SourceHealth => ({
  id: "src",
  label: "Src",
  url: "https://x",
  healthy: true,
  lastSuccessAt: "2026-06-13T00:00:00.000Z",
  lastFetchedAt: "2026-06-13T00:00:00.000Z",
  lastError: null,
  lastStatus: 200,
  consecutiveFailures: 0,
  stalenessHours: 2,
  stale: false,
  recordCount: 10,
  ...over,
});

describe("formatHealthReport", () => {
  it("flags DOWN, STALE, and ok sources and counts those needing attention", () => {
    const report = formatHealthReport("saas", [
      s({ id: "ok-one" }),
      s({ id: "down-one", healthy: false, lastError: "fetch failed 500", lastStatus: 500 }),
      s({ id: "stale-one", stale: true, stalenessHours: 400 }),
    ]);
    expect(report).toContain("2/3 need attention");
    expect(report).toMatch(/\[DOWN\s*\] down-one/);
    expect(report).toMatch(/\[STALE\s*\] stale-one/);
    expect(report).toMatch(/\[ok\s*\] ok-one/);
    expect(report).toContain("fetch failed 500");
  });

  it("shows 0 need attention when all healthy", () => {
    expect(formatHealthReport("saas", [s({})])).toContain("0/1 need attention");
  });
});
