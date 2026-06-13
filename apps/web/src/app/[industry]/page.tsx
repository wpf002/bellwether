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
      <main className="mx-auto max-w-5xl p-10">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← all industries
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">{meta?.label ?? industry}</h1>
        <p className="mt-4 text-neutral-500">
          No data yet — the API may be down, or this industry has no signals. Run a scrape cycle for{" "}
          <code>{industry}</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← all industries
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{meta?.label ?? industry}</h1>
      <p className="text-sm text-neutral-500">
        {overview.totals.events} events · {overview.totals.companies} company mentions ·{" "}
        {overview.totals.complaints} complaints · last 7 days
      </p>
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
