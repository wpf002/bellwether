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

type Tab = "overview" | "competitors" | "feed";

function formatKpi(value: KpiValue): string {
  if (value == null) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value;
  const entries = Object.entries(value).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "—";
  return entries.map(([k, n]) => `${k} ${n < 1 ? `${Math.round(n * 100)}%` : n}`).join(" · ");
}

function Cite({ ids, citations }: { ids: string[]; citations: Record<string, string | null> }) {
  const urls = ids.map((id) => citations[id]).filter((u): u is string => Boolean(u));
  if (urls.length === 0) return <span className="text-xs text-neutral-400"> (no source)</span>;
  return (
    <span className="ml-1 space-x-1 text-xs">
      {urls.slice(0, 3).map((u, i) => (
        <a
          key={u}
          href={u}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
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

  return (
    <div className="mt-6">
      <nav className="flex gap-1 border-b">
        {(
          [
            ["overview", "Market Overview"],
            ["competitors", "Competitor Tracker"],
            ["feed", "Trend Feed"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              tab === key
                ? "border-neutral-900 font-medium text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="mt-5 space-y-5">
          <p className="rounded-lg bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800">
            {overview.narrative}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {overview.kpis.map((k: KpiResult) => (
              <div key={k.id} className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide text-neutral-500">{k.label}</div>
                <div className="mt-1 text-sm font-medium text-neutral-900">
                  {formatKpi(k.value)}
                </div>
              </div>
            ))}
          </div>
          {digest && (
            <div className="space-y-4">
              <DigestList
                title="What changed"
                findings={digest.whatChanged}
                citations={digest.citations}
              />
              <DigestList
                title="Key players"
                findings={digest.keyPlayers}
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
        <section className="mt-5">
          <p className="mb-3 text-sm text-neutral-500">
            Check companies to track them — your selection is saved in this browser and pinned to
            the top.
          </p>
          <ul className="space-y-2">
            {sortedCompanies.length === 0 && (
              <li className="text-neutral-500">No companies yet.</li>
            )}
            {sortedCompanies.map((c) => (
              <li
                key={c.name}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  tracked.includes(c.name) ? "border-neutral-900 bg-neutral-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={tracked.includes(c.name)}
                  onChange={() => toggle(c.name)}
                  aria-label={`Track ${c.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-neutral-500">
                      {c.mentions} mentions · {Math.round(c.share * 100)}% SoV
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-neutral-100">
                    <div
                      className="h-1.5 rounded bg-neutral-800"
                      style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }}
                    />
                  </div>
                  {c.urls[0] && (
                    <a
                      href={c.urls[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                    >
                      source
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "feed" && (
        <section className="mt-5">
          <ul className="divide-y">
            {events.length === 0 && <li className="py-3 text-neutral-500">No events yet.</li>}
            {events.map((e: EventItem) => (
              <li key={e.signalId} className="flex gap-3 py-3">
                <span className="mt-0.5 shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {e.kind.replace(/_/g, " ")}
                </span>
                <div className="min-w-0">
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {e.headline}
                    </a>
                  ) : (
                    <span>{e.headline}</span>
                  )}
                  <div className="text-xs text-neutral-400">
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
    <div>
      <h3 className="text-sm font-semibold text-neutral-700">
        {title} <span className="text-neutral-400">({findings.length})</span>
      </h3>
      {findings.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-400">— none —</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {findings.slice(0, 25).map((f) => (
            <li key={f.signalId} className="text-sm text-neutral-800">
              {f.claim}
              <Cite ids={f.sourceRecordIds} citations={citations} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
