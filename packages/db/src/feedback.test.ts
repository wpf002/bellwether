import { describe, expect, it } from "vitest";
import { scoreSource } from "./feedback.js";

describe("scoreSource", () => {
  it("rewards yield and useful feedback, penalizes not-useful", () => {
    expect(scoreSource({ recordCount: 10, useful: 0, notUseful: 0 })).toBe(10);
    expect(scoreSource({ recordCount: 10, useful: 2, notUseful: 0 })).toBe(16);
    expect(scoreSource({ recordCount: 10, useful: 0, notUseful: 4 })).toBe(-2);
  });

  it("ranks a low-yield, disliked source below a high-yield, liked one", () => {
    const liked = scoreSource({ recordCount: 20, useful: 5, notUseful: 0 });
    const disliked = scoreSource({ recordCount: 3, useful: 0, notUseful: 5 });
    expect(liked).toBeGreaterThan(disliked);
  });
});
