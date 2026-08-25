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
  domain: string | null;
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

// ---- Monitor Mode types ----

export interface Monitor {
  id: string;
  orgId: string | null;
  name: string;
  domain: string | null;
  description: string | null;
  industryId: string | null;
  createdAt: string;
}

export interface MonitorCompetitor {
  id: string;
  monitorId: string;
  name: string;
  domain: string | null;
}

export interface MonitorSource {
  id: string;
  monitorId: string;
  label: string;
  kind: string;
  adapter: string;
  url: string;
  extractAs: string[];
  createdAt: string;
}

export interface MonitorDetail extends Monitor {
  competitors: MonitorCompetitor[];
  sources: MonitorSource[];
}

export interface MonitorSignal {
  id: string;
  industry_id: string;
  entity_kind: string;
  payload: Record<string, unknown>;
  created_at: string;
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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "request failed" }));
    throw new Error((err as { error?: string }).error ?? "request failed");
  }
  return (await res.json()) as T;
}

async function del(path: string): Promise<void> {
  await fetch(`${API_BASE}${path}`, { method: "DELETE" });
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

  // Monitor Mode
  monitors: () => get<Monitor[]>("/monitors", []),
  monitor: (id: string) => get<MonitorDetail | null>(`/monitors/${id}`, null),
  monitorSignals: (id: string, limit = 50, kind?: string) =>
    get<{ signals: MonitorSignal[]; total: number; monitor: { id: string; name: string } }>(
      `/monitors/${id}/signals?limit=${limit}${kind ? `&kind=${kind}` : ""}`,
      { signals: [], total: 0, monitor: { id, name: "" } },
    ),
  createMonitor: (body: { name: string; domain?: string; description?: string; industryId?: string }) =>
    post<Monitor>("/monitors", body),
  addCompetitor: (monitorId: string, body: { name: string; domain?: string }) =>
    post<MonitorCompetitor>(`/monitors/${monitorId}/competitors`, body),
  removeCompetitor: (monitorId: string, cId: string) =>
    del(`/monitors/${monitorId}/competitors/${cId}`),
  addMonitorSource: (
    monitorId: string,
    body: { label: string; kind: string; adapter: string; url: string; extractAs?: string[] },
  ) => post<MonitorSource>(`/monitors/${monitorId}/sources`, body),
  removeMonitorSource: (monitorId: string, sId: string) =>
    del(`/monitors/${monitorId}/sources/${sId}`),
};
