import { describe, expect, it } from "vitest";
import { parseIndustryPack } from "@bellwether/core";
import { industryPacks, getIndustryPack, listIndustryPacks } from "./index.js";
import { ecommercePack } from "./packs/ecommerce.js";

/**
 * The Phase 2 thesis check: a second vertical is just another pack. These guard
 * that both packs validate on load (boot-validation) and that the registry
 * exposes them uniformly — no per-industry code path.
 */
describe("industry registry", () => {
  it("registers both verticals", () => {
    expect(Object.keys(industryPacks).sort()).toEqual(["ecommerce", "saas"]);
    expect(listIndustryPacks()).toHaveLength(2);
  });

  it("validates the e-commerce pack against the same IndustryPack schema", () => {
    expect(() => parseIndustryPack(ecommercePack)).not.toThrow();
  });

  it("e-commerce reuses the canonical entity kinds (no new engine types)", () => {
    expect([...getIndustryPack("ecommerce").entityKinds].sort()).toEqual([
      "company",
      "market_event",
      "sentiment_theme",
    ]);
  });

  it("every source scopes extraction to declared entity kinds", () => {
    for (const source of getIndustryPack("ecommerce").sources) {
      for (const kind of source.extractAs ?? []) {
        expect(getIndustryPack("ecommerce").prompts.some((p) => p.entityKind === kind)).toBe(true);
      }
    }
  });

  it("throws on an unknown industry", () => {
    expect(() => getIndustryPack("nope")).toThrow(/Unknown industry pack/);
  });
});
