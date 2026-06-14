import Link from "next/link";

export const metadata = {
  title: "Pricing — Bellwether",
  description: "Simple, transparent plans. Free to explore; paid to track at scale.",
};

// Mirrors PLAN_LIMITS in @bellwether/core (packages/core/src/tenancy.ts) — the
// single source of truth the API enforces.
const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Explore one market with the full, cited dashboard.",
    cta: "Browse industries",
    href: "/",
    highlight: false,
    features: [
      "1 industry",
      "Full dashboard — overview, competitor tracker, trend feed",
      "A cited source on every claim",
      "14-day signal momentum",
      "30 API requests / min",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    cadence: "per month",
    blurb: "Track a portfolio of markets and competitors.",
    cta: "Browse industries",
    href: "/",
    highlight: true,
    features: [
      "Up to 5 industries",
      "Everything in Free",
      "Weekly digest email (cited PDF)",
      "Competitor watchlist + scoping",
      "Source-health monitoring",
      "300 API requests / min",
    ],
  },
  {
    name: "Enterprise",
    price: "$499",
    cadence: "per month",
    blurb: "Org-wide coverage with governance and advanced modules.",
    cta: "Contact sales",
    href: "mailto:sales@bellwether.example?subject=Bellwether%20Enterprise",
    highlight: false,
    features: [
      "Unlimited industries",
      "Everything in Pro",
      "Role-based access (owner / admin / member / viewer)",
      "Audit log",
      "Opportunity map + regulatory feed",
      "3,000 API requests / min",
    ],
  },
];

function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600">Pricing</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
          Pay for coverage, not for the data.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-500">
          The intelligence is one shared, cited catalog. Your plan governs how many markets you
          track and how hard you can hit the API — not which facts you&apos;re allowed to see.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`card relative flex flex-col p-6 ${
              p.highlight ? "ring-2 ring-brand-500" : ""
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow">
                Most popular
              </span>
            )}
            <h2 className="text-lg font-semibold text-ink">{p.name}</h2>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-ink">{p.price}</span>
              <span className="text-sm text-ink-400">{p.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-ink-500">{p.blurb}</p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-ink-700">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={p.href}
              className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                p.highlight
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "border border-slate-300 text-ink-700 hover:bg-slate-50"
              }`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-ink-400">
        Plans are enforced by the API today (sign up → org + API key → subscribe). Self-serve web
        checkout via Stripe is a drop-in and on the roadmap. See the{" "}
        <Link href="/methodology" className="link-cite font-medium">
          methodology
        </Link>{" "}
        for how the data is produced.
      </p>
    </main>
  );
}
