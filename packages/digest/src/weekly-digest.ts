import { computeKpis, type Signal, type IndustryPack, type KpiResult } from "@bellwether/core";

/**
 * The Phase 1 product output. Not a dashboard — a structured digest that can be
 * rendered to PDF/email. Every Finding carries the source record ids that back
 * it, so nothing is asserted without provenance (the citation layer). This is
 * the discipline that keeps Bellwether from being a feed reader.
 */

export interface Finding {
  claim: string;
  /** Raw record ids supporting the claim — the citation layer. */
  sourceRecordIds: string[];
  signalId: string;
}

export interface WeeklyDigest {
  industryId: string;
  periodStart: string;
  periodEnd: string;
  /** Declarative KPIs computed from the pack's KpiDefs (deterministic). */
  kpis: KpiResult[];
  keyPlayers: Finding[];
  whatChanged: Finding[];
  buyerComplaints: Finding[];
  generatedAt: string;
}

export interface BuildDigestInput {
  pack: IndustryPack;
  signals: Signal[];
  periodStart: string;
  periodEnd: string;
}

/**
 * Builds a digest purely by partitioning + counting signals. No LLM calls here:
 * the model already did its one job (extraction) upstream. Aggregation is
 * deterministic and replayable.
 */
export function buildWeeklyDigest(input: BuildDigestInput): WeeklyDigest {
  const { pack, signals, periodStart, periodEnd } = input;

  const toFinding = (s: Signal, claim: string): Finding => ({
    claim,
    sourceRecordIds: s.sourceRecordIds,
    signalId: s.id,
  });

  const keyPlayers = signals
    .filter((s) => s.entityKind === "company")
    .map((s) => toFinding(s, `Active player: ${String(s.payload.name ?? "unknown")}`));

  const whatChanged = signals
    .filter((s) => s.entityKind === "market_event")
    .map((s) => toFinding(s, String(s.payload.headline ?? "market event")));

  const buyerComplaints = signals
    .filter((s) => s.entityKind === "sentiment_theme" && s.payload.polarity === "negative")
    .map((s) => toFinding(s, `Complaint theme: ${String(s.payload.theme ?? "unknown")}`));

  return {
    industryId: pack.id,
    periodStart,
    periodEnd,
    kpis: computeKpis(pack, signals),
    keyPlayers,
    whatChanged,
    buyerComplaints,
    generatedAt: new Date().toISOString(),
  };
}
