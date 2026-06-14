"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { companyDomain, logoFor, initials } from "@/lib/format";

interface IndustryRef {
  id: string;
  label: string;
}

interface Group {
  id: string;
  label: string;
  companies: string[];
}

function CompanyChip({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const src = logoFor(companyDomain(name));
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink-700">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] rounded bg-white object-contain ring-1 ring-slate-200"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded bg-brand-50 text-[9px] font-semibold text-brand-700 ring-1 ring-brand-100">
          {initials(name)}
        </span>
      )}
      {name}
    </span>
  );
}

export function WatchlistView({ industries }: { industries: IndustryRef[] }) {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    const out: Group[] = [];
    for (const ind of industries) {
      try {
        const raw = localStorage.getItem(`bellwether:competitors:${ind.id}`);
        if (!raw) continue;
        const companies = JSON.parse(raw) as string[];
        if (Array.isArray(companies) && companies.length > 0) {
          out.push({ id: ind.id, label: ind.label, companies });
        }
      } catch {
        /* ignore malformed entries */
      }
    }
    setGroups(out);
  }, [industries]);

  if (groups === null) {
    return <div className="mt-8 text-sm text-ink-400">Loading your watchlist…</div>;
  }

  const total = groups.reduce((s, g) => s + g.companies.length, 0);

  if (total === 0) {
    return (
      <div className="card mt-8 p-8 text-center">
        <p className="text-ink-600">You aren&apos;t tracking any companies yet.</p>
        <p className="mt-2 text-sm text-ink-400">
          Open any industry, go to{" "}
          <span className="font-medium text-ink-600">Competitor Tracker</span>, and check the
          companies you want to follow.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Browse industries
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex items-center gap-3 text-sm text-ink-500">
        <span className="font-mono text-2xl font-semibold tabular-nums text-ink">{total}</span>
        companies across
        <span className="font-mono text-2xl font-semibold tabular-nums text-ink">
          {groups.length}
        </span>
        {groups.length === 1 ? "industry" : "industries"}
      </div>

      <div className="mt-6 space-y-5">
        {groups.map((g) => (
          <div key={g.id} className="card p-5">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                {g.label}
              </h2>
              <Link href={`/${g.id}`} className="link-cite text-xs font-medium">
                Open dashboard →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.companies.map((c) => (
                <CompanyChip key={c} name={c} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
