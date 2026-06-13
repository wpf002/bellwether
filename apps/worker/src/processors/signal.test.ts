import { describe, expect, it } from "vitest";
import { Signal } from "@bellwether/core";
import { buildExtractedSignal } from "./signal.js";

describe("buildExtractedSignal", () => {
  it("wraps an extraction payload as a valid Signal with provenance + lineage", async () => {
    const signal = await buildExtractedSignal({
      id: "sig_1",
      industryId: "saas",
      entityKind: "market_event",
      payload: { kind: "product_launch", headline: "Acme ships X", occurredAt: null },
      rawRecordId: "raw_42",
      sourceId: "saas-techcrunch",
      createdAt: "2026-06-13T00:00:00.000Z",
    });

    // Provenance: traces back to the raw record it came from.
    expect(signal.sourceRecordIds).toEqual(["raw_42"]);
    // Lineage: exactly one auditable extract step, carrying its detail.
    expect(signal.lineage).toHaveLength(1);
    expect(signal.lineage[0]?.step).toBe("extract.structured");
    expect(signal.lineage[0]?.detail).toMatchObject({
      sourceId: "saas-techcrunch",
      entityKind: "market_event",
    });
    // The result is a schema-valid Signal — provenance invariant holds at storage.
    expect(() => Signal.parse(signal)).not.toThrow();
  });

  it("preserves the extracted payload verbatim", async () => {
    const payload = { theme: "onboarding friction", polarity: "negative" };
    const signal = await buildExtractedSignal({
      id: "sig_2",
      industryId: "saas",
      entityKind: "sentiment_theme",
      payload,
      rawRecordId: "raw_7",
      sourceId: "saas-reddit-saas",
      createdAt: "2026-06-13T00:00:00.000Z",
    });
    expect(signal.payload).toEqual(payload);
  });
});
