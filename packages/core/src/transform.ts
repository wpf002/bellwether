import type { Signal, TransformRecord } from "./signal.js";

/**
 * A TransformStep takes a working Signal and returns a new one, appending
 * exactly one TransformRecord to its lineage. Steps MUST be pure with respect
 * to the signal (side effects like DB writes happen in the worker, not here)
 * so the chain stays replayable and testable.
 */
export interface TransformStep {
  readonly name: string;
  apply(signal: Signal): Promise<Signal> | Signal;
}

function stamp(name: string, detail: Record<string, unknown> = {}): TransformRecord {
  return { step: name, at: new Date().toISOString(), detail };
}

/**
 * Runs a chain of steps in order, recording lineage as it goes.
 * The returned Signal has a complete, ordered audit trail.
 */
export async function runChain(input: Signal, steps: TransformStep[]): Promise<Signal> {
  let current = input;
  for (const step of steps) {
    const next = await step.apply(current);
    // Defensive: guarantee the step recorded its lineage entry.
    const lastLineage = next.lineage[next.lineage.length - 1];
    if (!lastLineage || lastLineage.step !== step.name) {
      current = { ...next, lineage: [...next.lineage, stamp(step.name)] };
    } else {
      current = next;
    }
  }
  return current;
}

/** Helper for steps to append their own lineage entry cleanly. */
export function withLineage(
  signal: Signal,
  name: string,
  patch: Partial<Signal>,
  detail: Record<string, unknown> = {},
): Signal {
  return {
    ...signal,
    ...patch,
    lineage: [...signal.lineage, stamp(name, detail)],
  };
}
