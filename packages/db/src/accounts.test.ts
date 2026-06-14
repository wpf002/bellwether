import { describe, expect, it } from "vitest";
import { hashApiKey, generateApiKey } from "./accounts.js";

describe("API keys", () => {
  it("hashes deterministically", () => {
    expect(hashApiKey("secret")).toBe(hashApiKey("secret"));
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
    expect(hashApiKey("x")).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it("generates a prefixed key whose hash matches", () => {
    const k = generateApiKey();
    expect(k.secret.startsWith("bw_")).toBe(true);
    expect(k.prefix).toBe(k.secret.slice(0, 11));
    expect(k.hashed).toBe(hashApiKey(k.secret));
  });

  it("generates unique keys", () => {
    expect(generateApiKey().secret).not.toBe(generateApiKey().secret);
  });
});
