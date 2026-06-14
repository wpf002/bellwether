// Thin typed client for the Bellwether API. Types mirror the API DTOs; kept
// local so the web app doesn't take a build dependency on the server package.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Industry {
  id: string;
  label: string;
  description: string;
  sourceCount: number;
  kpis: { id: string; label: string }[];
}

export type KpiValue = number | Record<string, number> | string | null;
export interface KpiResult {
  id: string;
  label: string;
  aggregation: string;
  entityKind: string;
  field?: string;
  value: KpiValue;
}

export interface Overview {
  industryId: string;
  periodStart: string;
  periodEnd: string;
  totals: { companies: number; events: number; complaints: number };
  kpis: KpiResult[];
  narrative: string;
}

export interface EventItem {
  signalId: string;
  kind: string;
  headline: string;
  occurredAt: string | null;
  detectedAt: string;
  url: string | null;
}

export interface CompanyItem {
  name: string;
  mentions: number;
  share: number;
  urls: string[];
}

export interface TrendPoint {
  date: string;
  events: number;
  companies: number;
  complaints: number;
}

export interface Finding {
  claim: string;
  sourceRecordIds: string[];
  signalId: string;
}
export interface Digest {
  industryId: string;
  periodStart: string;
  periodEnd: string;
  kpis: KpiResult[];
  keyPlayers: Finding[];
  whatChanged: Finding[];
  buyerComplaints: Finding[];
  generatedAt: string;
  citations: Record<string, string | null>;
}

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const api = {
  industries: () => get<Industry[]>("/industries", []),
  overview: (id: string, days = 7) =>
    get<Overview | null>(`/industries/${id}/overview?days=${days}`, null),
  events: (id: string, limit = 50) =>
    get<EventItem[]>(`/industries/${id}/events?limit=${limit}`, []),
  companies: (id: string, days = 7) =>
    get<CompanyItem[]>(`/industries/${id}/companies?days=${days}`, []),
  digest: (id: string, days = 7) =>
    get<Digest | null>(`/industries/${id}/digest?days=${days}`, null),
  trends: (id: string, days = 14) => get<TrendPoint[]>(`/industries/${id}/trends?days=${days}`, []),
};
