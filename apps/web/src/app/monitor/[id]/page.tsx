import Link from "next/link";
import { api } from "@/lib/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const KIND_COLORS: Record<string, string> = {
  product_launch: "bg-emerald-100 text-emerald-700",
  product_update: "bg-sky-100 text-sky-700",
  pricing_change: "bg-amber-100 text-amber-700",
  funding: "bg-violet-100 text-violet-700",
  acquisition: "bg-rose-100 text-rose-700",
  partnership: "bg-teal-100 text-teal-700",
  expansion: "bg-blue-100 text-blue-700",
  leadership_change: "bg-orange-100 text-orange-700",
  layoffs: "bg-red-100 text-red-700",
  earnings: "bg-lime-100 text-lime-700",
  regulatory: "bg-yellow-100 text-yellow-700",
  security_incident: "bg-red-100 text-red-700",
  research: "bg-indigo-100 text-indigo-700",
  analysis: "bg-slate-100 text-slate-700",
  sentiment_theme: "bg-purple-100 text-purple-700",
  company: "bg-blue-100 text-blue-700",
};

function kindLabel(k: string) {
  return k.replace(/_/g, " ");
}

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [monitor, signalResult] = await Promise.all([
    api.monitor(id),
    api.monitorSignals(id, 100),
  ]);

  if (!monitor) notFound();

  const signals = signalResult.signals ?? [];
  const events = signals.filter((s) => s.entity_kind === "market_event");
  const companies = signals.filter((s) => s.entity_kind === "company");
  const sentiment = signals.filter((s) => s.entity_kind === "sentiment_theme");

  return (
    <main>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/monitor" className="mt-1 text-sm text-ink-400 hover:text-brand-600 shrink-0">
          ← Monitors
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-4">
        {monitor.domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${monitor.domain}&sz=48`}
            alt=""
            className="h-10 w-10 rounded-lg border border-surface-300 bg-white p-1"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-lg font-bold text-brand-700">
            {monitor.name[0]?.toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{monitor.name}</h1>
          {monitor.domain && <p className="text-sm text-ink-400">{monitor.domain}</p>}
        </div>
        <span className="ml-auto rounded-full bg-surface-200 px-3 py-1 text-xs font-medium capitalize text-ink-500">
          {monitor.industryId ?? "custom"}
        </span>
      </div>

      {monitor.description && (
        <p className="mt-2 text-sm text-ink-500 max-w-2xl">{monitor.description}</p>
      )}

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-4 gap-3">
        {[
          { label: "Total signals", value: signalResult.total },
          { label: "Market events", value: events.length },
          { label: "Companies", value: companies.length },
          { label: "Sentiment", value: sentiment.length },
        ].map((kpi) => (
          <div key={kpi.label} className="card px-4 py-3">
            <div className="font-mono text-2xl font-bold text-ink tabular-nums">{kpi.value}</div>
            <div className="text-xs text-ink-400 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Signal feed */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Signal Feed</h2>
          {signals.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-ink-500">No signals yet.</p>
              <p className="text-xs text-ink-400">
                A scrape was enqueued when you added sources. Check back after the next cron cycle (06:00 UTC).
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {signals.map((s, i) => {
                const p = s.payload as Record<string, string | undefined>;
                const kind = s.entity_kind === "market_event" ? (p.kind ?? "market_event") : s.entity_kind;
                const title = p.headline ?? p.name ?? p.theme ?? kind;
                const url = p.url ?? null;
                const date = new Date(s.created_at).toLocaleDateString();
                const color = KIND_COLORS[kind] ?? "bg-surface-200 text-ink-500";

                return (
                  <div key={s.id ?? i} className="card flex gap-3 px-4 py-3">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}
                    >
                      {kindLabel(kind)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-ink hover:text-brand-600 hover:underline"
                        >
                          {title}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-ink">{title}</span>
                      )}
                      {p.company && (
                        <span className="ml-2 text-xs text-ink-400">{p.company}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-ink-400">{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: competitors + sources */}
        <div className="space-y-4">
          {/* Competitors */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Competitors</h2>
              <span className="text-xs text-ink-400">{monitor.competitors.length}</span>
            </div>
            {monitor.competitors.length === 0 ? (
              <p className="text-xs text-ink-400">None added yet.</p>
            ) : (
              <div className="space-y-1.5">
                {monitor.competitors.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    {c.domain && (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=16`}
                        alt=""
                        className="h-3.5 w-3.5 rounded"
                      />
                    )}
                    <span className="text-sm text-ink">{c.name}</span>
                    {c.domain && <span className="ml-auto text-xs text-ink-400">{c.domain}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom sources */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Signal Sources</h2>
              <span className="text-xs text-ink-400">{monitor.sources.length}</span>
            </div>
            {monitor.sources.length === 0 ? (
              <p className="text-xs text-ink-400">No custom sources.</p>
            ) : (
              <div className="space-y-1.5">
                {monitor.sources.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        s.kind === "social_public"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {s.kind === "social_public" ? "keyword" : "feed"}
                    </span>
                    <span className="text-xs text-ink truncate">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
            <Link
              href={`/monitor/${monitor.id}/edit`}
              className="mt-3 block text-center text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              + Add sources
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
