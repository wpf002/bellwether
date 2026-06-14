import type { Signal } from "./signal.js";

/**
 * Phase 7 — advanced modules, as deterministic bolt-ons over existing signals.
 * No new collection, no model judgment: they re-slice the same provenance-backed
 * signals, so every output stays citable.
 *
 * Deliberately NOT here: competitive-interaction simulation. The roadmap defers
 * it — it needs historical data and model accuracy that don't exist yet.
 */

export interface ThemeCluster {
  theme: string;
  mentions: number;
  polarity: "negative" | "neutral" | "positive";
  sourceRecordIds: string[];
}

export interface OpportunityMap {
  /** Recurring pain points (dominant-negative themes) — the gaps = opportunities. */
  opportunities: ThemeCluster[];
  /** Recurring praise (dominant-positive themes) — what's working. */
  strengths: ThemeCluster[];
}

const dominant = (counts: Record<string, number>): "negative" | "neutral" | "positive" => {
  const order = ["negative", "neutral", "positive"] as const;
  return order.reduce((best, p) => ((counts[p] ?? 0) > (counts[best] ?? 0) ? p : best), "neutral");
};

/**
 * Clusters sentiment-theme signals by theme, scores each by mention count, and
 * splits into opportunities (dominant-negative) vs strengths (dominant-positive),
 * each ranked by frequency. Magnitude = count of provenance, never a model score.
 */
export function opportunityMap(signals: Signal[]): OpportunityMap {
  const byTheme = new Map<
    string,
    { theme: string; mentions: number; counts: Record<string, number>; ids: string[] }
  >();
  for (const s of signals) {
    if (s.entityKind !== "sentiment_theme") continue;
    const theme = String(s.payload.theme ?? "").trim();
    if (!theme) continue;
    const polarity = String(s.payload.polarity ?? "neutral");
    const key = theme.toLowerCase();
    const e = byTheme.get(key) ?? { theme, mentions: 0, counts: {}, ids: [] };
    e.mentions += 1;
    e.counts[polarity] = (e.counts[polarity] ?? 0) + 1;
    e.ids.push(...s.sourceRecordIds);
    byTheme.set(key, e);
  }

  const clusters: ThemeCluster[] = [...byTheme.values()].map((e) => ({
    theme: e.theme,
    mentions: e.mentions,
    polarity: dominant(e.counts),
    sourceRecordIds: [...new Set(e.ids)],
  }));

  const byMentions = (a: ThemeCluster, b: ThemeCluster) => b.mentions - a.mentions;
  return {
    opportunities: clusters.filter((c) => c.polarity === "negative").sort(byMentions),
    strengths: clusters.filter((c) => c.polarity === "positive").sort(byMentions),
  };
}

export interface RegulatoryEvent {
  signalId: string;
  headline: string;
  occurredAt: string | null;
  detectedAt: string;
  sourceRecordIds: string[];
}

/** Regulatory market events — the per-industry compliance feed. */
export function regulatoryEvents(signals: Signal[]): RegulatoryEvent[] {
  return signals
    .filter((s) => s.entityKind === "market_event" && s.payload.kind === "regulatory")
    .map((s) => ({
      signalId: s.id,
      headline: String(s.payload.headline ?? "regulatory event"),
      occurredAt: (s.payload.occurredAt as string | null) ?? null,
      detectedAt: s.createdAt,
      sourceRecordIds: s.sourceRecordIds,
    }))
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}
