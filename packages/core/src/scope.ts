import type { Signal } from "./signal.js";

/**
 * Competitor scoping: narrow signals to a watchlist of company names. Company
 * signals match by name; market events match if a tracked name appears in the
 * headline; sentiment themes are kept as market-wide context. An empty
 * watchlist returns everything unchanged.
 *
 * Matching is deterministic substring/equality on lowercased names — no model
 * judgment.
 */
export function filterByCompetitors(signals: Signal[], names: string[]): Signal[] {
  const watch = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
  if (watch.length === 0) return signals;

  return signals.filter((s) => {
    if (s.entityKind === "company") {
      const name = String(s.payload.name ?? "").toLowerCase();
      return watch.some((w) => name === w || name.includes(w) || w.includes(name));
    }
    if (s.entityKind === "market_event") {
      const headline = String(s.payload.headline ?? "").toLowerCase();
      return watch.some((w) => headline.includes(w));
    }
    return true; // sentiment_theme: market-wide context, always kept
  });
}
