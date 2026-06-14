import { describe, expect, it } from "vitest";
import { RateLimiter } from "./ratelimit.js";

describe("RateLimiter", () => {
  it("allows up to the limit then blocks within the window", () => {
    const now = 1_000_000;
    const rl = new RateLimiter(() => now);
    expect(rl.check("org", 3).allowed).toBe(true);
    expect(rl.check("org", 3).allowed).toBe(true);
    expect(rl.check("org", 3).allowed).toBe(true);
    expect(rl.check("org", 3).allowed).toBe(false); // 4th in window
  });

  it("recovers after the window slides", () => {
    let now = 0;
    const rl = new RateLimiter(() => now);
    rl.check("org", 1);
    expect(rl.check("org", 1).allowed).toBe(false);
    now += 61_000; // past the 60s window
    expect(rl.check("org", 1).allowed).toBe(true);
  });

  it("isolates keys", () => {
    const now = 0;
    const rl = new RateLimiter(() => now);
    rl.check("a", 1);
    expect(rl.check("a", 1).allowed).toBe(false);
    expect(rl.check("b", 1).allowed).toBe(true);
  });

  it("treats Infinity as unlimited", () => {
    const rl = new RateLimiter();
    for (let i = 0; i < 100; i++) {
      expect(rl.check("ent", Number.POSITIVE_INFINITY).allowed).toBe(true);
    }
  });
});
