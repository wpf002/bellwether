"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CompanyItem,
  Digest,
  EventItem,
  Finding,
  KpiResult,
  KpiValue,
  Overview,
} from "@/lib/api";
import { humanize, kindStyle, logoFor, initials } from "@/lib/format";

type Tab = "overview" | "competitors" | "feed";

function formatKpi(value: KpiValue): string {
  if (value == null) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value;
  const entries = Object.entries(value).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "—";
  return entries
    .map(([k, n]) => `${humanize(k)} ${n < 1 ? `${Math.round(n * 100)}%` : n}`)
    .join("  ·  ");
}

function CompanyLogo({ name, url }: { name: string; url?: string }) {
  const [failed, setFailed] = useState(false);
  const src = logoFor(url);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-md bg-white object-contain ring-1 ring-slate-200"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
      {initials(name)}
    </span>
  );
}

function Cite({ ids, citations }: { ids: string[]; citations: Record<string, string | null> }) {
  const urls = ids.map((id) => citations[id]).filter((u): u is string => Boolean(u));
  if (urls.length === 0) return <span className="text-xs text-ink-400"> (no source)</span>;
  return (
    <span className="ml-1 space-x-1 text-xs">
      {urls.slice(0, 3).map((u, i) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="link-cite">
          [{i + 1}]
        </a>
      ))}
    </span>
  );
}

export function Dashboard({
  industryId,
  overview,
  companies,
  events,
  digest,
}: {
  industryId: string;
  overview: Overview;
  companies: CompanyItem[];
  events: EventItem[];
  digest: Digest | null;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [tracked, setTracked] = useState<string[]>([]);
  const [scoped, setScoped] = useState(false);
  const storeKey = `bellwether:competitors:${industryId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setTracked(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, [storeKey]);

  const toggle = (name: string) => {
    setTracked((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      try {
        localStorage.setItem(storeKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sortedCompanies = useMemo(
    () =>
      [...companies].sort((a, b) => {
        const at = tracked.includes(a.name) ? 1 : 0;
        const bt = tracked.includes(b.name) ? 1 : 0;
        return bt - at || b.mentions - a.mentions;
      }),
    [companies, tracked],
  );

  const active = scoped && tracked.length > 0;
  const inScope = (text: string) =>
    tracked.some((n) => text.toLowerCase().includes(n.toLowerCase()));
  const shownEvents = active ? events.filter((e) => inScope(e.headline)) : events;
  const scopeFindings = (fs: Finding[]) => (active ? fs.filter((f) => inScope(f.claim)) : fs);

  const tabs: [Tab, string][] = [
    ["overview", "Market Overview"],
    ["competitors", "Competitor Tracker"],
    ["feed", "Trend Feed"],
  ];

  return (
    <div className="mt-6">
      {/* Stat strip */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:max-w-xl">
        <Stat label="Market events" value={overview.totals.events} />
        <Stat label="Company mentions" value={overview.totals.companies} />
        <Stat label="Buyer complaints" value={overview.totals.complaints} accent />
      </div>

      <nav className="flex items-center gap-6 border-b border-slate-200">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`tab ${tab === key ? "tab-active" : "tab-idle"}`}
          >
            {label}
          </button>
        ))}
        {tracked.length > 0 && (
          <label
            className="ml-auto flex cursor-pointer items-center gap-2 self-center text-xs text-ink-500"
            title="Show only the companies you've checked in Competitor Tracker. Filters players and events to your watchlist; market-wide sentiment is always shown."
          >
            <input
              type="checkbox"
              checked={scoped}
              onChange={(e) => setScoped(e.target.checked)}
              className="accent-brand-600"
            />
            Only my watchlist ({tracked.length})
          </label>
        )}
      </nav>

      {tab === "overview" && (
        <section className="mt-6 space-y-6">
          <p className="card border-l-4 border-l-brand-500 p-5 text-[15px] leading-relaxed text-ink-700">
            {overview.narrative}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.kpis.map((k: KpiResult) => (
              <div key={k.id} className="card p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  {k.label}
                </div>
                <div className="mt-1.5 text-sm font-medium text-ink">{formatKpi(k.value)}</div>
              </div>
            ))}
          </div>

          {digest && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <DigestList
                title="What changed"
                findings={scopeFindings(digest.whatChanged)}
                citations={digest.citations}
              />
              <DigestList
                title="Key players"
                findings={scopeFindings(digest.keyPlayers)}
                citations={digest.citations}
              />
              <DigestList
                title="Buyer complaints"
                findings={digest.buyerComplaints}
                citations={digest.citations}
              />
            </div>
          )}
        </section>
      )}

      {tab === "competitors" && (
        <section className="mt-6">
          <p className="mb-4 text-sm text-ink-500">
            Check companies to add them to your watchlist (saved in this browser). The{" "}
            <span className="font-medium text-ink-700">Only my watchlist</span> toggle then scopes
            every view to them.
          </p>
          <ul className="space-y-2.5">
            {sortedCompanies.length === 0 && (
              <li className="card p-5 text-ink-500">
                No companies extracted yet for this industry.
              </li>
            )}
            {sortedCompanies.map((c) => {
              const isTracked = tracked.includes(c.name);
              return (
                <li
                  key={c.name}
                  className={`card flex items-center gap-4 p-4 transition ${
                    isTracked ? "ring-2 ring-brand-500/60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isTracked}
                    onChange={() => toggle(c.name)}
                    aria-label={`Track ${c.name}`}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <CompanyLogo name={c.name} url={c.urls[0]} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium text-ink">{c.name}</span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {c.mentions} mentions · {Math.round(c.share * 100)}% SoV
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                        style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }}
                      />
                    </div>
                  </div>
                  {c.urls[0] && (
                    <a
                      href={c.urls[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="link-cite text-xs"
                    >
                      source ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "feed" && (
        <section className="mt-6">
          <ul className="space-y-1">
            {shownEvents.length === 0 && (
              <li className="card p-5 text-ink-500">No events in this window.</li>
            )}
            {shownEvents.map((e: EventItem) => (
              <li
                key={e.signalId}
                className="flex items-start gap-3 rounded-lg px-3 py-3 transition hover:bg-white/70"
              >
                <span className={`chip mt-0.5 shrink-0 ${kindStyle(e.kind)}`}>
                  {humanize(e.kind)}
                </span>
                <div className="min-w-0">
                  {e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink hover:text-brand-700 hover:underline"
                    >
                      {e.headline}
                    </a>
                  ) : (
                    <span className="text-ink">{e.headline}</span>
                  )}
                  <div className="text-xs text-ink-400">
                    {new Date(e.detectedAt).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="stat">
      <div className={`text-2xl font-semibold ${accent ? "text-accent-600" : "text-ink"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-ink-400">{label}</div>
    </div>
  );
}

function DigestList({
  title,
  findings,
  citations,
}: {
  title: string;
  findings: Finding[];
  citations: Record<string, string | null>;
}) {
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {title}
        <span className="chip bg-slate-100 text-ink-400">{findings.length}</span>
      </h3>
      {findings.length === 0 ? (
        <p className="mt-3 text-sm text-ink-400">— none —</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {findings.slice(0, 25).map((f) => (
            <li key={f.signalId} className="text-sm leading-snug text-ink-700">
              {f.claim}
              <Cite ids={f.sourceRecordIds} citations={citations} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
