import Link from "next/link";
import { api, API_BASE } from "@/lib/api";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACCENTS = [
  "from-brand-600 to-brand-400",
  "from-emerald-600 to-emerald-400",
  "from-amber-600 to-amber-400",
  "from-sky-600 to-sky-400",
  "from-rose-600 to-rose-400",
  "from-violet-600 to-violet-400",
];

export default async function Home() {
  const industries = await api.industries();

  return (
    <main>
      <section className="mb-10 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
          Live, cited market intelligence
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Choose an industry.
          <br />
          <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
            See where the market is heading.
          </span>
        </h1>
        <p className="mt-4 text-lg text-ink-500">
          Competitor moves, pricing shifts, and buyer sentiment — mined from public sources and
          structured through an auditable pipeline. Every claim links to its source.
        </p>
      </section>

      {industries.length === 0 ? (
        <div className="card p-6 text-ink-500">
          No industries loaded — is the API running on{" "}
          <code className="text-ink-700">{API_BASE}</code>?
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {industries.map((i, idx) => (
            <Link
              key={i.id}
              href={`/${i.id}`}
              className="card group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
                  ACCENTS[idx % ACCENTS.length]
                } text-sm font-semibold text-white shadow`}
              >
                {initials(i.label)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="truncate text-base font-semibold text-ink">{i.label}</h2>
                  <span className="shrink-0 text-xs font-medium text-ink-400 transition group-hover:text-brand-600">
                    {i.sourceCount} sources →
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">{i.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
