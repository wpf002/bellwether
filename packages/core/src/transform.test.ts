import { describe, expect, it } from "vitest";
import { Signal } from "./signal.js";
import { runChain, withLineage, type TransformStep } from "./transform.js";

/**
 * These tests pin the lineage contract that the whole platform leans on:
 * runChain must produce a Signal whose lineage is a complete, ordered audit
 * trail — one entry per step, in execution order — and must never lose the
 * provenance (`sourceRecordIds`) that justifies the Signal's existence.
 *
 * If any of these break, "provenance or it doesn't exist" (ROADMAP invariant 1)
 * is no longer enforced by the engine. Treat a failure here as a contract
 * regression, not a flaky test.
 */

function baseSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "sig_1",
    industryId: "saas",
    entityKind: "company",
    payload: { name: "Acme" },
    sourceRecordIds: ["raw_1"],
    lineage: [],
    createdAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("runChain", () => {
  it("returns the input unchanged when there are no steps", async () => {
    const input = baseSignal();
    const out = await runChain(input, []);
    expect(out).toEqual(input);
    expect(out.lineage).toHaveLength(0);
  });

  it("records exactly one lineage entry per step, in execution order", async () => {
    const steps: TransformStep[] = [
      { name: "extract.entities", apply: (s) => withLineage(s, "extract.entities", {}) },
      { name: "normalize.pricing", apply: (s) => withLineage(s, "normalize.pricing", {}) },
      { name: "score.relevance", apply: (s) => withLineage(s, "score.relevance", {}) },
    ];

    const out = await runChain(baseSignal(), steps);

    expect(out.lineage.map((l) => l.step)).toEqual([
      "extract.entities",
      "normalize.pricing",
      "score.relevance",
    ]);
  });

  it("carries each step's structured detail into the lineage", async () => {
    const steps: TransformStep[] = [
      {
        name: "normalize.pricing",
        apply: (s) => withLineage(s, "normalize.pricing", {}, { currency: "USD", from: "$19/mo" }),
      },
    ];

    const out = await runChain(baseSignal(), steps);

    expect(out.lineage[0]?.detail).toEqual({ currency: "USD", from: "$19/mo" });
  });

  it("preserves provenance (sourceRecordIds) across the chain", async () => {
    const input = baseSignal({ sourceRecordIds: ["raw_1", "raw_2"] });
    const steps: TransformStep[] = [
      { name: "a", apply: (s) => withLineage(s, "a", {}) },
      { name: "b", apply: (s) => withLineage(s, "b", { payload: { name: "Acme Corp" } }) },
    ];

    const out = await runChain(input, steps);

    expect(out.sourceRecordIds).toEqual(["raw_1", "raw_2"]);
    expect(out.payload).toEqual({ name: "Acme Corp" });
  });

  it("defensively stamps lineage for a step that forgets to record its own", async () => {
    // A misbehaving step that mutates the payload but skips withLineage().
    // runChain must still guarantee the audit trail is complete.
    const forgetful: TransformStep = {
      name: "score.relevance",
      apply: (s) => ({ ...s, payload: { ...s.payload, score: 0.9 } }),
    };

    const out = await runChain(baseSignal(), [forgetful]);

    expect(out.lineage).toHaveLength(1);
    expect(out.lineage[0]?.step).toBe("score.relevance");
    expect(out.payload).toMatchObject({ score: 0.9 });
  });

  it("does not double-stamp when a step already recorded its lineage entry", async () => {
    const wellBehaved: TransformStep = {
      name: "extract.entities",
      apply: (s) => withLineage(s, "extract.entities", {}),
    };

    const out = await runChain(baseSignal(), [wellBehaved]);

    expect(out.lineage).toHaveLength(1);
  });

  it("awaits async steps and threads the result into the next step", async () => {
    const steps: TransformStep[] = [
      {
        name: "fetch.enrich",
        apply: async (s) => {
          await Promise.resolve();
          return withLineage(s, "fetch.enrich", { payload: { name: "Acme", employees: 42 } });
        },
      },
      {
        name: "score.relevance",
        apply: (s) =>
          withLineage(s, "score.relevance", {
            payload: { ...s.payload, score: 1 },
          }),
      },
    ];

    const out = await runChain(baseSignal(), steps);

    expect(out.payload).toEqual({ name: "Acme", employees: 42, score: 1 });
    expect(out.lineage.map((l) => l.step)).toEqual(["fetch.enrich", "score.relevance"]);
  });

  it("produces a Signal that still satisfies the Signal schema", async () => {
    const out = await runChain(baseSignal(), [
      { name: "extract.entities", apply: (s) => withLineage(s, "extract.entities", {}) },
    ]);

    // The engine's output must remain a valid Signal — provenance present,
    // lineage entries well-formed. Parsing throws if the contract drifted.
    expect(() => Signal.parse(out)).not.toThrow();
  });
});
