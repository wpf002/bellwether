import Link from "next/link";
import { api, API_BASE } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const industries = await api.industries();
  return (
    <main className="mx-auto max-w-3xl p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Bellwether</h1>
      <p className="mt-2 text-neutral-600">Choose an industry. See where the market is heading.</p>

      <ul className="mt-8 space-y-3">
        {industries.length === 0 && (
          <li className="text-neutral-500">
            No industries loaded — is the API running on <code>{API_BASE}</code>?
          </li>
        )}
        {industries.map((i) => (
          <li key={i.id}>
            <Link
              href={`/${i.id}`}
              className="block rounded-lg border p-4 transition hover:border-neutral-400 hover:bg-neutral-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{i.label}</span>
                <span className="text-xs text-neutral-500">{i.sourceCount} sources →</span>
              </div>
              <div className="mt-1 text-sm text-neutral-600">{i.description}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
