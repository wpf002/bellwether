import type { ExtractJob } from "../queues.js";

/**
 * Phase 1: run the pack's extraction prompt over a raw record to produce typed
 * structured data, wrap it as a Signal with full lineage (extract step), and
 * persist. Uses @bellwether/extract (structured-output-only) and
 * @bellwether/core runChain for the auditable transform chain.
 *
 * TODO(Phase 1): implement extraction -> Signal -> persist.
 */
export async function processExtract(job: ExtractJob): Promise<void> {
  void job;
}
