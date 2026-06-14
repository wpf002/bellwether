/** snake_case / kebab-case → Title Case (e.g. "product_launch" → "Product Launch"). */
export function humanize(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best-effort hostname from a URL (for favicon lookup / display). */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * A company logo URL from a domain (or a source URL). Uses Google's favicon
 * service — no API key, works for any public domain. Returns null if no domain.
 */
export function logoFor(domainOrUrl: string | null | undefined): string | null {
  if (!domainOrUrl) return null;
  const host = domainOrUrl.includes("/") ? hostOf(domainOrUrl) : domainOrUrl.replace(/^www\./, "");
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

/** Two-letter initials for a logo fallback. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Tailwind classes for an event-kind badge — color-codes the trend feed. */
export function kindStyle(kind: string): string {
  const map: Record<string, string> = {
    product_launch: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    pricing_change: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    funding: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    acquisition: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    leadership_change: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    regulatory: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    campaign: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
    other: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
  return map[kind] ?? map.other!;
}
