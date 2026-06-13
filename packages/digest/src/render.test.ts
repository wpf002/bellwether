import { describe, expect, it } from "vitest";
import type { WeeklyDigest } from "./weekly-digest.js";
import { digestSections, renderDigestPdf } from "./render.js";

const digest: WeeklyDigest = {
  industryId: "saas",
  periodStart: "2026-06-07T00:00:00.000Z",
  periodEnd: "2026-06-13T23:59:59.000Z",
  keyPlayers: [{ claim: "Active player: Stripe", sourceRecordIds: ["raw_a"], signalId: "c1" }],
  whatChanged: [{ claim: "Stripe ships X", sourceRecordIds: ["raw_b"], signalId: "e1" }],
  buyerComplaints: [],
  generatedAt: "2026-06-13T12:00:00.000Z",
};

describe("digestSections", () => {
  it("returns the three sections in order", () => {
    expect(digestSections(digest).map((s) => s.heading)).toEqual([
      "Key players",
      "What changed",
      "Buyer sentiment",
    ]);
  });
});

describe("renderDigestPdf", () => {
  it("produces a non-empty PDF document", async () => {
    const pdf = await renderDigestPdf(digest, {
      sourceUrls: { raw_b: "https://stripe.com/blog/x" },
    });
    expect(pdf.length).toBeGreaterThan(0);
    // PDFs start with the "%PDF" magic header.
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders even when a section is empty", async () => {
    const pdf = await renderDigestPdf({ ...digest, keyPlayers: [], whatChanged: [] });
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
