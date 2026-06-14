"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CompanyItem, Digest, EventItem, KpiResult, Overview } from "@/lib/api";
import { humanize, kindStyle, logoFor, hostOf, initials } from "@/lib/format";
import { Donut, BarList, PALETTE, type Slice } from "@/components/Charts";

type Tab = "overview" | "competitors" | "feed";

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#10b981",
  neutral: "#94a3b8",
  negative: "#ef4444",
};

function kpiRecord(kpis: KpiResult[], match: (k: KpiResult) => boolean): Record<string, number> {
  const k = kpis.find(match);
  return k && typeof k.value === "object" && k.value !== null
    ? (k.value as Record<string, number>)
    : {};
}

function CompanyLogo({ name, url, size = 28 }: { name: string; url?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = logoFor(url);
  const cls = `shrink-0 rounded-md bg-white object-contain ring-1 ring-slate-200`;
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className={cls}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100"
    >
      {initials(name)}
    </span>
  );
}

function Cite({ ids, citations }: { ids: string[]; citations: Record<string, string | null> }) {
  const urls = ids.map((id) => citations[id]).filter((u): u is string => Boolean(u));
  if (urls.length === 0) return null;
  return (
    <a href={urls[0]} target="_blank" rel="noreferrer" className="link-cite shrink-0 text-xs">
      source ↗
    </a>
  );
}

function Panel({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        {title}
        {count != null && <span className="chip bg-slate-100 text-ink-400">{count}</span>}
      </h3>
      {children}
    </div>
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
  const shownCompanies = active ? sortedCompanies.filter((c) => inScope(c.name)) : sortedCompanies;

  // ---- chart data ----
  const mindshare: Slice[] = useMemo(() => {
    const top = shownCompanies.slice(0, 6);
    const rest = shownCompanies.slice(6);
    const slices = top.map((c, i) => ({ label: c.name, value: c.mentions, color: PALETTE[i]! }));
    const restTotal = rest.reduce((s, c) => s + c.mentions, 0);
    if (restTotal > 0) slices.push({ label: "Other", value: restTotal, color: PALETTE[8]! });
    return slices;
  }, [shownCompanies]);

  const sentiment: Slice[] = Object.entries(
    kpiRecord(overview.kpis, (k) => k.entityKind === "sentiment_theme"),
  )
    .map(([k, v]) => ({ label: humanize(k), value: v, color: SENTIMENT_COLOR[k] ?? "#94a3b8" }))
    .sort((a, b) => b.value - a.value);

  const eventMix: Slice[] = Object.entries(
    kpiRecord(overview.kpis, (k) => k.entityKind === "market_event" && k.field === "kind"),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([k, v], i) => ({ label: humanize(k), value: v, color: PALETTE[i]! }));

  const tabs: [Tab, string][] = [
    ["overview", "Market Overview"],
    ["competitors", "Competitor Tracker"],
    ["feed", "Trend Feed"],
  ];

  return (
    <div className="mt-6">
      <div className="mb-6 grid grid-cols-3 gap-3 sm:max-w-xl">
        <Stat label="Market Events" value={overview.totals.events} />
        <Stat label="Company Mentions" value={overview.totals.companies} />
        <Stat label="Buyer Complaints" value={overview.totals.complaints} accent />
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
            title="Show only the companies you've added to your watchlist in Competitor Tracker. Filters players and events to your watchlist; market-wide sentiment is always shown."
          >
            <input
              type="checkbox"
              checked={scoped}
              onChange={(e) => setScoped(e.target.checked)}
              className="accent-brand-600"
            />
            Only My Watchlist ({tracked.length})
          </label>
        )}
      </nav>

      {tab === "overview" && (
        <section className="mt-6 space-y-6">
          <p className="card border-l-4 border-l-brand-500 p-5 text-[15px] leading-relaxed text-ink-700">
            {overview.narrative}
          </p>

          {/* Visualization row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Panel title="Competitive Mindshare">
              {mindshare.length === 0 ? (
                <p className="text-sm text-ink-400">No company mentions yet.</p>
              ) : (
                <div className="flex items-center gap-5">
                  <Donut data={mindshare} />
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {shownCompanies.slice(0, 6).map((c, i) => (
                      <li key={c.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: PALETTE[i] }}
                        />
                        <CompanyLogo name={c.name} url={c.urls[0]} size={18} />
                        <span className="min-w-0 flex-1 truncate text-ink-700">{c.name}</span>
                        <span className="shrink-0 tabular-nums text-ink-400">
                          {Math.round(c.share * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <Panel title="Buyer Sentiment">
              {sentiment.length === 0 ? (
                <p className="text-sm text-ink-400">No sentiment yet.</p>
              ) : (
                <BarList data={sentiment} />
              )}
            </Panel>

            <Panel title="Event Mix">
              {eventMix.length === 0 ? (
                <p className="text-sm text-ink-400">No events yet.</p>
              ) : (
                <BarList data={eventMix} />
              )}
            </Panel>
          </div>

          {/* Content row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title="What Changed" count={shownEvents.length}>
              <ul className="divide-y divide-slate-100">
                {shownEvents.length === 0 && (
                  <li className="py-2 text-sm text-ink-400">— none —</li>
                )}
                {shownEvents.slice(0, 12).map((e) => (
                  <EventRow key={e.signalId} e={e} />
                ))}
              </ul>
            </Panel>

            <Panel title="Buyer Complaints" count={digest?.buyerComplaints.length ?? 0}>
              <ul className="space-y-2.5">
                {(!digest || digest.buyerComplaints.length === 0) && (
                  <li className="text-sm text-ink-400">— none —</li>
                )}
                {digest?.buyerComplaints.slice(0, 12).map((f) => (
                  <li
                    key={f.signalId}
                    className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50/40 p-3"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                    <span className="min-w-0 flex-1 text-sm text-ink-700">{f.claim}</span>
                    <Cite ids={f.sourceRecordIds} citations={digest.citations} />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </section>
      )}

      {tab === "competitors" && (
        <section className="mt-6">
          <p className="mb-4 text-sm text-ink-500">
            Check companies to add them to your watchlist (saved in this browser). The{" "}
            <span className="font-medium text-ink-700">Only My Watchlist</span> toggle then scopes
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
                        {c.mentions} mentions · {Math.round(c.share * 100)}%
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
            {shownEvents.map((e) => (
              <EventRow key={e.signalId} e={e} feed />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EventRow({ e, feed }: { e: EventItem; feed?: boolean }) {
  const host = hostOf(e.url);
  return (
    <li
      className={`flex items-start gap-3 ${feed ? "rounded-lg px-3 py-3 hover:bg-white/70" : "py-2.5"}`}
    >
      <span className={`chip mt-0.5 shrink-0 ${kindStyle(e.kind)}`}>{humanize(e.kind)}</span>
      <div className="min-w-0 flex-1">
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
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
          {host && <CompanyLogoless host={host} />}
          <span>{new Date(e.detectedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </li>
  );
}

function CompanyLogoless({ host }: { host: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <img src={logoFor(host) ?? ""} alt="" width={12} height={12} className="h-3 w-3 rounded-sm" />
      {host}
    </span>
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
