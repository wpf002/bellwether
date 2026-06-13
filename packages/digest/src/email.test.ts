import { describe, expect, it } from "vitest";
import type { WeeklyDigest } from "./weekly-digest.js";
import { digestEmail } from "./email.js";

const digest: WeeklyDigest = {
  industryId: "saas",
  periodStart: "2026-06-07T00:00:00.000Z",
  periodEnd: "2026-06-13T23:59:59.000Z",
  keyPlayers: [{ claim: "Active player: Stripe", sourceRecordIds: ["raw_a"], signalId: "c1" }],
  whatChanged: [{ claim: "Stripe ships <X> & more", sourceRecordIds: ["raw_b"], signalId: "e1" }],
  buyerComplaints: [],
  generatedAt: "2026-06-13T12:00:00.000Z",
};

describe("digestEmail", () => {
  const mail = digestEmail(digest);

  it("builds a dated subject", () => {
    expect(mail.subject).toBe("Bellwether saas digest — 2026-06-07 to 2026-06-13");
  });

  it("lists findings in the text body", () => {
    expect(mail.text).toContain("Active player: Stripe");
    expect(mail.text).toContain("Key players (1)");
  });

  it("HTML-escapes claims to avoid injection", () => {
    expect(mail.html).toContain("Stripe ships &lt;X&gt; &amp; more");
    expect(mail.html).not.toContain("ships <X>");
  });

  it("renders an empty section as 'none'", () => {
    expect(mail.html).toContain("Buyer sentiment (0)");
    expect(mail.html).toContain("<em>none</em>");
  });
});
