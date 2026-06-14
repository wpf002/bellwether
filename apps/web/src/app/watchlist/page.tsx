import { api } from "@/lib/api";
import { WatchlistView } from "./WatchlistView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Watchlist — Bellwether",
  description: "Every company you're tracking, across every industry.",
};

export default async function WatchlistPage() {
  const industries = await api.industries();
  return (
    <main className="mx-auto max-w-4xl">
      <p className="text-sm font-medium uppercase tracking-wider text-brand-600">Watchlist</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">Everything you track.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-500">
        Companies you&apos;ve checked in any industry&apos;s Competitor Tracker, gathered in one
        place. Saved in this browser.
      </p>
      <WatchlistView industries={industries.map((i) => ({ id: i.id, label: i.label }))} />
    </main>
  );
}
