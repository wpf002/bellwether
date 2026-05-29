import type { DigestJob } from "../queues.js";

/**
 * Phase 1: load the period's signals, call buildWeeklyDigest (deterministic,
 * no LLM), persist the digest, and (Phase 1 output) render to PDF/email.
 *
 * TODO(Phase 1): implement load -> buildWeeklyDigest -> persist -> deliver.
 */
export async function processDigest(job: DigestJob): Promise<void> {
  void job;
}
