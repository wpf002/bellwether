import Link from "next/link";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Methodology — Bellwether",
  description: "How Bellwether turns public sources into cited market intelligence.",
};

const STEPS = [
  {
    n: "01",
    title: "Collect",
    body: "Robots-permitted RSS/Atom feeds and server-rendered pages — trade press, first-party company blogs, pricing pages, and public discussion. Every fetch respects robots.txt and fails closed; nothing is collected behind a login or a TOS that forbids it.",
  },
  {
    n: "02",
    title: "Extract",
    body: "An LLM reads each raw record and extracts structured entities — companies, market events, sentiment themes — with typed, validated output. The model only ever extracts what the text says. It never scores, ranks, or predicts.",
  },
  {
    n: "03",
    title: "Aggregate",
    body: "KPIs (share of voice, event mix, sentiment) are computed deterministically in code — plain counts over the extracted signals. Because the math is code, not a model, every number is reproducible and traces to its inputs.",
  },
  {
    n: "04",
    title: "Cite",
    body: "Each signal keeps the id of the raw record it came from, and each finding links back to its source URL. A citation check refuses to ship any claim that isn't backed by a record.",
  },
];

const GUARANTEES = [
  {
    title: "Provenance on every signal",
    body: "No claim exists without a raw record behind it. Click 'source' on anything to read the original.",
  },
  {
    title: "The model extracts, never decides",
    body: "Judgment (what's important, where the market is heading) is left to deterministic code and to you — not to a black box.",
  },
  {
    title: "Crawl etiquette is enforced",
    body: "robots.txt is checked before every fetch; disallowed sources are skipped, with retry/backoff that never retries a hard block.",
  },
  {
    title: "Quality is measured, not assumed",
    body: "Per-industry source health and a quality score are tracked over time, and a feedback loop re-ranks sources that prove reliable.",
  },
];

export default async function MethodologyPage() {
  const industries = await api.industries();
  const totalSources = industries.reduce((s, i) => s + i.sourceCount, 0);

  return (
    <main className="mx-auto max-w-4xl">
      <p className="text-sm font-medium uppercase tracking-wider text-brand-600">Methodology</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
        Every claim, traceable to its source.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-500">
        Bellwether mines public sources and structures them through an auditable pipeline. The point
        isn&apos;t a clever model — it&apos;s that you can check the work. Here&apos;s exactly how
        it runs.
      </p>

      <div className="mt-8 grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="px-5 py-4">
          <div className="font-mono text-3xl font-semibold tabular-nums text-ink">
            {industries.length}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-ink-400">
            Industries
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="font-mono text-3xl font-semibold tabular-nums text-ink">
            {totalSources}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-ink-400">
            Live sources
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="font-mono text-3xl font-semibold tabular-nums text-ink">100%</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-ink-400">
            Claims cited
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink">The pipeline</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-semibold text-brand-500">{s.n}</span>
                <h3 className="text-base font-semibold text-ink">{s.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink">The guarantees</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GUARANTEES.map((g) => (
            <div
              key={g.title}
              className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <div>
                <h3 className="text-sm font-semibold text-ink">{g.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{g.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink">Source coverage</h2>
        <p className="mt-1 text-sm text-ink-500">
          The exact number of live sources behind each industry. Open one to see every signal and
          its citation.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {industries.map((i, idx) => (
            <Link
              key={i.id}
              href={`/${i.id}`}
              className={`flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-slate-50 ${
                idx > 0 ? "border-t border-slate-100" : ""
              }`}
            >
              <span className="truncate text-sm font-medium text-ink">{i.label}</span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-ink-400">
                {i.sourceCount} sources →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-12 text-sm text-ink-400">
        Want the commercial terms?{" "}
        <Link href="/pricing" className="link-cite font-medium">
          See pricing →
        </Link>
      </p>
    </main>
  );
}
