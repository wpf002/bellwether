async function getIndustries() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${base}/industries`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Array<{ id: string; label: string; description: string }>;
  } catch {
    return [];
  }
}

export default async function Home() {
  const industries = await getIndustries();
  return (
    <main className="mx-auto max-w-3xl p-10">
      <h1 className="text-3xl font-semibold">Bellwether</h1>
      <p className="mt-2 text-neutral-600">Choose an industry. See where the market is heading.</p>

      <ul className="mt-8 space-y-3">
        {industries.length === 0 && (
          <li className="text-neutral-500">
            No industries loaded — is the API running on{" "}
            <code>{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}</code>?
          </li>
        )}
        {industries.map((i) => (
          <li key={i.id} className="rounded-lg border p-4">
            <div className="font-medium">{i.label}</div>
            <div className="text-sm text-neutral-600">{i.description}</div>
          </li>
        ))}
      </ul>

      {/* Phase 3: replace this landing with the Market Overview / Competitor
          Tracker / Trend Feed dashboard. Build it against the frontend-design
          system, not ad hoc. */}
    </main>
  );
}
