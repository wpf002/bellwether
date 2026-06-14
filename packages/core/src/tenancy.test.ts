import { describe, expect, it } from "vitest";
import { planLimit, roleAllows, computeMrr, orgsByPlan, churnRate } from "./tenancy.js";

describe("plans & roles", () => {
  it("maps plans to limits and prices", () => {
    expect(planLimit("pro").monthlyUsd).toBe(99);
    expect(planLimit("free").industries).toBe(1);
    expect(planLimit("enterprise").industries).toBe(Number.POSITIVE_INFINITY);
    expect(planLimit("nonsense").monthlyUsd).toBe(0); // unknown → free
  });

  it("orders roles", () => {
    expect(roleAllows("owner", "admin")).toBe(true);
    expect(roleAllows("admin", "admin")).toBe(true);
    expect(roleAllows("member", "admin")).toBe(false);
    expect(roleAllows("viewer", "member")).toBe(false);
    expect(roleAllows("bogus", "viewer")).toBe(false);
  });
});

describe("billing math", () => {
  const orgs = [
    { plan: "pro", canceledAt: null },
    { plan: "enterprise", canceledAt: null },
    { plan: "free", canceledAt: null },
    { plan: "pro", canceledAt: "2026-06-01T00:00:00Z" }, // canceled
  ];

  it("computes MRR from active orgs only", () => {
    expect(computeMrr(orgs)).toBe(99 + 499 + 0); // canceled pro excluded
  });

  it("groups active orgs by plan", () => {
    expect(orgsByPlan(orgs)).toEqual({ pro: 1, enterprise: 1, free: 1 });
  });

  it("computes churn", () => {
    expect(churnRate(orgs)).toBe(0.25);
    expect(churnRate([])).toBe(0);
  });
});
