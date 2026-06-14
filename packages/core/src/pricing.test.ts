import { describe, expect, it } from "vitest";
import { diffPricing } from "./pricing.js";

describe("diffPricing", () => {
  const base = [
    { name: "Free", monthlyUsd: 0 },
    { name: "Pro", monthlyUsd: 20 },
  ];

  it("returns null when unchanged", () => {
    expect(
      diffPricing(base, [
        { name: "Free", monthlyUsd: 0 },
        { name: "Pro", monthlyUsd: 20 },
      ]),
    ).toBeNull();
  });

  it("detects a price move", () => {
    const d = diffPricing(base, [
      { name: "Free", monthlyUsd: 0 },
      { name: "Pro", monthlyUsd: 25 },
    ]);
    expect(d).toContain("Pro");
    expect(d).toContain("20 → 25");
  });

  it("detects added and removed tiers", () => {
    const d = diffPricing(base, [
      { name: "Pro", monthlyUsd: 20 },
      { name: "Enterprise", monthlyUsd: 200 },
    ]);
    expect(d).toContain('added tier "Enterprise"');
    expect(d).toContain('removed tier "Free"');
  });

  it("is case-insensitive on tier names", () => {
    expect(
      diffPricing(base, [
        { name: "free", monthlyUsd: 0 },
        { name: "pro", monthlyUsd: 20 },
      ]),
    ).toBeNull();
  });
});
