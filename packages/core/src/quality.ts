import type { Signal } from "./signal.js";

/**
 * Phase 5 — the per-industry quality metric. Pure and deterministic so it can be
 * snapshotted over time and trended. Every number is derived by counting
 * provenance and feedback, never by a model judgment.
 */
export interface QualityMetric {
  signalCount: number;
  /** Fraction of signals backed by ≥1 source record. The provenance invariant
   *  guarantees this is 1.0 — we measure it to prove the guarantee holds. */
  citationRate: number;
  /** Healthy sources / total sources. */
  coverage: number;
  /** useful / (useful + not_useful) from user feedback; null if no feedback yet. */
  usefulRate: number | null;
  /** Signals/digests users acted on. */
  actedCount: number;
  byKind: Record<string, number>;
}

export interface QualityParts {
  signals: Pick<Signal, "entityKind" | "sourceRecordIds">[];
  sources: { healthy: boolean }[];
  feedback: { kind: string }[];
}

export function computeQuality(parts: QualityParts): QualityMetric {
  const { signals, sources, feedback } = parts;

  const cited = signals.filter((s) => s.sourceRecordIds.length > 0).length;
  const healthy = sources.filter((s) => s.healthy).length;

  const useful = feedback.filter((f) => f.kind === "useful").length;
  const notUseful = feedback.filter((f) => f.kind === "not_useful").length;
  const acted = feedback.filter((f) => f.kind === "acted").length;

  const byKind: Record<string, number> = {};
  for (const s of signals) byKind[s.entityKind] = (byKind[s.entityKind] ?? 0) + 1;

  return {
    signalCount: signals.length,
    citationRate: signals.length === 0 ? 1 : cited / signals.length,
    coverage: sources.length === 0 ? 0 : healthy / sources.length,
    usefulRate: useful + notUseful === 0 ? null : useful / (useful + notUseful),
    actedCount: acted,
    byKind,
  };
}
