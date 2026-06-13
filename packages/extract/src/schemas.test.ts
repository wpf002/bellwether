import { describe, expect, it } from "vitest";
import {
  extractionSchemas,
  isExtractionEmpty,
  CompanyExtraction,
  SentimentExtraction,
  MarketEventExtraction,
} from "./schemas.js";

/**
 * These guard the contract between the extraction prompts (which document the
 * JSON keys) and the schemas that validate the model's output. If a prompt and
 * its schema drift apart, valid extractions get rejected — so pin representative
 * shapes here.
 */

describe("extraction schemas", () => {
  it("exposes one schema per entity kind", () => {
    expect(Object.keys(extractionSchemas).sort()).toEqual([
      "company",
      "market_event",
      "sentiment_theme",
    ]);
  });

  it("parses a well-formed company extraction", () => {
    const parsed = CompanyExtraction.parse({
      name: "Stripe",
      domain: "stripe.com",
      positioning: "Payments infrastructure for the internet",
      pricingTiers: [
        { name: "Standard", monthlyUsd: null, annualUsd: null, unit: "per transaction" },
      ],
      features: ["Billing", "Connect"],
    });
    expect(parsed.name).toBe("Stripe");
    expect(parsed.pricingTiers).toHaveLength(1);
  });

  it("defaults missing company arrays rather than failing", () => {
    const parsed = CompanyExtraction.parse({ name: "Acme", domain: null, positioning: null });
    expect(parsed.pricingTiers).toEqual([]);
    expect(parsed.features).toEqual([]);
  });

  it("accepts a null occurredAt on a market event", () => {
    const parsed = MarketEventExtraction.parse({
      kind: "product_launch",
      headline: "Acme ships X",
      occurredAt: null,
    });
    expect(parsed.kind).toBe("product_launch");
  });

  it("rejects an out-of-enum event kind", () => {
    expect(() =>
      MarketEventExtraction.parse({ kind: "rebrand", headline: "x", occurredAt: null }),
    ).toThrow();
  });

  it("rejects an out-of-enum sentiment polarity", () => {
    expect(() => SentimentExtraction.parse({ theme: "pricing", polarity: "angry" })).toThrow();
  });

  it("accepts a null company name (model declined)", () => {
    expect(
      CompanyExtraction.parse({ name: null, domain: null, positioning: null }).name,
    ).toBeNull();
  });
});

describe("isExtractionEmpty", () => {
  it("treats a null/blank company name as empty", () => {
    expect(isExtractionEmpty("company", { name: null })).toBe(true);
    expect(isExtractionEmpty("company", { name: "  " })).toBe(true);
    expect(isExtractionEmpty("company", { name: "Stripe" })).toBe(false);
  });

  it("keys sentiment on theme and events on headline", () => {
    expect(isExtractionEmpty("sentiment_theme", { theme: "" })).toBe(true);
    expect(isExtractionEmpty("sentiment_theme", { theme: "pricing" })).toBe(false);
    expect(isExtractionEmpty("market_event", { headline: null })).toBe(true);
    expect(isExtractionEmpty("market_event", { headline: "Acme ships X" })).toBe(false);
  });
});
