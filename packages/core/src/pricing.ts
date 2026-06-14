/**
 * Deterministic pricing-change detection. The LLM extracts pricing tiers from a
 * page snapshot; this code DIFFS two snapshots and decides whether pricing
 * moved — keeping the "model extracts, never decides" invariant. Feeds a
 * `pricing_change` market event when it returns a description.
 */

export interface PricingTierLike {
  name: string;
  monthlyUsd?: number | null;
  annualUsd?: number | null;
}

function priceKey(t: PricingTierLike): string {
  return `${t.monthlyUsd ?? "?"}/${t.annualUsd ?? "?"}`;
}

/**
 * Compares two tier lists and returns a human-readable change summary, or null
 * if pricing is unchanged. Detects added/removed tiers and price moves on
 * matching tier names.
 */
export function diffPricing(prev: PricingTierLike[], next: PricingTierLike[]): string | null {
  const prevByName = new Map(prev.map((t) => [t.name.toLowerCase(), t]));
  const nextByName = new Map(next.map((t) => [t.name.toLowerCase(), t]));
  const changes: string[] = [];

  for (const t of next) {
    if (!prevByName.has(t.name.toLowerCase())) changes.push(`added tier "${t.name}"`);
  }
  for (const t of prev) {
    if (!nextByName.has(t.name.toLowerCase())) changes.push(`removed tier "${t.name}"`);
  }
  for (const t of next) {
    const before = prevByName.get(t.name.toLowerCase());
    if (before && priceKey(before) !== priceKey(t)) {
      changes.push(`"${t.name}" price ${before.monthlyUsd ?? "?"} → ${t.monthlyUsd ?? "?"} /mo`);
    }
  }

  return changes.length ? changes.join("; ") : null;
}
