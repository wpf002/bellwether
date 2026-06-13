import { describe, expect, it } from "vitest";
import { fetchTextWithRetry, ScrapeError } from "./fetch.js";

const noSleep = async () => {};
const resp = (status: number, body = "") =>
  ({ ok: status >= 200 && status < 300, status, text: async () => body }) as unknown as Response;

describe("fetchTextWithRetry", () => {
  it("returns the body on first success", async () => {
    let calls = 0;
    const body = await fetchTextWithRetry(
      "u",
      {},
      {
        fetchImpl: async () => {
          calls++;
          return resp(200, "hello");
        },
        sleepImpl: noSleep,
      },
    );
    expect(body).toBe("hello");
    expect(calls).toBe(1);
  });

  it("retries transient 5xx then succeeds", async () => {
    let calls = 0;
    const body = await fetchTextWithRetry(
      "u",
      {},
      {
        maxRetries: 3,
        sleepImpl: noSleep,
        fetchImpl: async () => {
          calls++;
          return calls < 3 ? resp(503) : resp(200, "ok");
        },
      },
    );
    expect(body).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry a terminal 404", async () => {
    let calls = 0;
    await expect(
      fetchTextWithRetry(
        "u",
        {},
        {
          sleepImpl: noSleep,
          fetchImpl: async () => {
            calls++;
            return resp(404);
          },
        },
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(calls).toBe(1);
  });

  it("treats 403 (bot wall) as terminal — does not hammer", async () => {
    let calls = 0;
    await expect(
      fetchTextWithRetry(
        "u",
        {},
        { sleepImpl: noSleep, fetchImpl: async () => (calls++, resp(403)) },
      ),
    ).rejects.toBeInstanceOf(ScrapeError);
    expect(calls).toBe(1);
  });

  it("exhausts retries on persistent network errors", async () => {
    let calls = 0;
    await expect(
      fetchTextWithRetry(
        "u",
        {},
        {
          maxRetries: 2,
          sleepImpl: noSleep,
          fetchImpl: async () => {
            calls++;
            throw new Error("ECONNRESET");
          },
        },
      ),
    ).rejects.toBeInstanceOf(ScrapeError);
    expect(calls).toBe(3); // initial + 2 retries
  });
});
