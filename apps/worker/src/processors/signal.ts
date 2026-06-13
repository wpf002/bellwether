import { runChain, withLineage, type EntityKind, type Signal } from "@bellwether/core";

export interface BuildSignalInput {
  id: string;
  industryId: string;
  entityKind: EntityKind;
  /** The validated structured-extraction payload. */
  payload: Record<string, unknown>;
  /** The raw record this signal was extracted from — its provenance. */
  rawRecordId: string;
  sourceId: string;
  createdAt: string;
}

/**
 * Wraps a validated extraction payload as a Signal with full lineage, running it
 * through `runChain` so the audit trail (extract step + provenance) is recorded
 * by the same engine everything else uses. Pure: no IO, so it's unit-testable
 * and the lineage contract is exercised end-to-end.
 */
export function buildExtractedSignal(input: BuildSignalInput): Promise<Signal> {
  const seed: Signal = {
    id: input.id,
    industryId: input.industryId,
    entityKind: input.entityKind,
    payload: input.payload,
    sourceRecordIds: [input.rawRecordId],
    lineage: [],
    createdAt: input.createdAt,
  };
  return runChain(seed, [
    {
      name: "extract.structured",
      apply: (s) =>
        withLineage(
          s,
          "extract.structured",
          {},
          { sourceId: input.sourceId, entityKind: input.entityKind },
        ),
    },
  ]);
}
