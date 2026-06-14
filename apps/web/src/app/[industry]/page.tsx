import Link from "next/link";
import { api } from "@/lib/api";
import { Dashboard } from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  const [industries, overview, companies, events, digest] = await Promise.all([
    api.industries(),
    api.overview(industry),
    api.companies(industry),
    api.events(industry, 100),
    api.digest(industry),
  ]);

  const meta = industries.find((i) => i.id === industry);

  if (!overview) {
    return (
      <main>
        <Link href="/" className="text-sm text-ink-400 hover:text-brand-600">
          ← All industries
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{meta?.label ?? industry}</h1>
        <div className="card mt-6 p-6 text-ink-500">
          No data yet for this industry. Run a scrape cycle: <br />
          <code className="text-ink-700">scheduler.js scrape {industry}</code>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Link href="/" className="text-sm text-ink-400 transition hover:text-brand-600">
        ← All industries
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {meta?.label ?? industry}
        </h1>
        <p className="text-sm text-ink-400">Rolling 7-day window · live, cited signals</p>
      </div>

      <Dashboard
        industryId={industry}
        overview={overview}
        companies={companies}
        events={events}
        digest={digest}
      />
    </main>
  );
}
