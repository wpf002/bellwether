import Link from "next/link";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MonitorListPage() {
  const monitors = await api.monitors();

  return (
    <main>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Monitors</h1>
          <p className="mt-1 text-sm text-ink-500">
            Hyper-focused intelligence on a specific company and its competitors.
          </p>
        </div>
        <Link
          href="/monitor/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <span className="text-lg leading-none">+</span> New Monitor
        </Link>
      </div>

      {monitors.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-4 px-6 py-12 text-center">
          <div className="text-4xl">🎯</div>
          <h2 className="text-lg font-semibold text-ink">No monitors yet</h2>
          <p className="max-w-sm text-sm text-ink-500">
            A monitor tracks a single company — its competitors, custom publications, keywords, and
            influencers — all in one scoped signal feed.
          </p>
          <Link
            href="/monitor/new"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Create your first monitor
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {monitors.map((m) => (
            <Link
              key={m.id}
              href={`/monitor/${m.id}`}
              className="card group flex flex-col gap-3 p-5 transition hover:border-brand-400"
            >
              <div className="flex items-start gap-3">
                {m.domain ? (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${m.domain}&sz=32`}
                    alt=""
                    className="mt-0.5 h-6 w-6 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-100 text-xs font-bold text-brand-700">
                    {m.name[0]?.toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate group-hover:text-brand-600">
                    {m.name}
                  </div>
                  {m.domain && (
                    <div className="text-xs text-ink-400 truncate">{m.domain}</div>
                  )}
                </div>
              </div>

              {m.description && (
                <p className="text-xs text-ink-500 line-clamp-2">{m.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-ink-400 mt-auto pt-1 border-t border-surface-300">
                {m.industryId && (
                  <span className="rounded bg-surface-200 px-2 py-0.5 font-medium capitalize">
                    {m.industryId}
                  </span>
                )}
                <span>
                  Created {new Date(m.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
