import type { IndustryPack, KpiDef, ExtractionPrompt } from "@bellwether/core";

/**
 * Starter industry catalog. saas + ecommerce are the hand-curated flagship packs
 * (rich first-party + pricing-page sources). The verticals here are generated
 * from a template so the platform ships breadth: each pulls LIVE data from
 * Hacker News topic feeds (hnrss.org is robots-permitted and supports arbitrary
 * `?q=` queries), giving every industry real, cited signals the moment it's
 * scraped. Deepening any vertical = add curated sources to its pack, exactly as
 * saas did — config, not code.
 */

const STANDARD_KPIS: KpiDef[] = [
  {
    id: "share_of_voice",
    label: "Share of voice (by company)",
    aggregation: "share_of_voice",
    entityKind: "company",
    field: "name",
  },
  {
    id: "negative_themes",
    label: "Top complaints",
    aggregation: "count",
    entityKind: "sentiment_theme",
    field: "polarity",
  },
  {
    id: "event_mix",
    label: "Event mix (30d)",
    aggregation: "count",
    entityKind: "market_event",
    field: "kind",
  },
];

function prompts(label: string): ExtractionPrompt[] {
  return [
    {
      id: "company",
      entityKind: "company",
      system: `Extract a ${label} company/vendor profile from the text — an organization that sells a product or service in this space, NOT a product, feature, event, or funding round. If the text names no specific company, set name to null and leave other fields empty. Use the company's own name. JSON keys: name (string|null), domain, positioning, pricingTiers[], features[].`,
    },
    {
      id: "sentiment",
      entityKind: "sentiment_theme",
      system: `Extract one recurring buyer/user sentiment theme and its polarity (positive|neutral|negative) from the discussion text about ${label}. Do not weight or score importance. JSON keys: theme, polarity.`,
    },
    {
      id: "event",
      entityKind: "market_event",
      system: `Extract one ${label} market event (product_launch|pricing_change|funding|acquisition|leadership_change|regulatory|campaign|other) with a headline and occurredAt if stated. JSON keys: kind, headline, occurredAt.`,
    },
  ];
}

function makePack(o: {
  id: string;
  label: string;
  description: string;
  query: string;
}): IndustryPack {
  const q = encodeURIComponent(o.query);
  return {
    id: o.id,
    label: o.label,
    version: "0.1.0",
    description: o.description,
    entityKinds: ["company", "sentiment_theme", "market_event"],
    sources: [
      {
        id: `${o.id}-news`,
        label: `${o.label} — Hacker News (signals)`,
        kind: "rss",
        adapter: "rss-news",
        url: `https://hnrss.org/newest?q=${q}&points=20`,
        mayContainPersonalData: false,
        extractAs: ["market_event", "company"],
      },
      {
        id: `${o.id}-discussion`,
        label: `${o.label} — Hacker News (discussion)`,
        kind: "social_public",
        adapter: "rss-news",
        url: `https://hnrss.org/newest?q=${q}&points=2`,
        mayContainPersonalData: true,
        extractAs: ["sentiment_theme"],
      },
    ],
    kpis: STANDARD_KPIS,
    prompts: prompts(o.label),
  };
}

/** 18 template-generated verticals (saas + ecommerce live in their own files). */
export const catalogPacks: IndustryPack[] = [
  {
    id: "fintech",
    label: "Fintech & Payments",
    description: "Digital banking, payments, lending, and financial infrastructure.",
    query: "fintech OR payments",
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    description: "Security platforms, threat detection, identity, and compliance tooling.",
    query: "cybersecurity OR security breach",
  },
  {
    id: "devtools",
    label: "Developer Tools",
    description: "IDEs, CI/CD, observability, and the software development toolchain.",
    query: "developer tools",
  },
  {
    id: "ai-infra",
    label: "AI Infrastructure",
    description: "Foundation models, inference, vector databases, and the AI stack.",
    query: "AI infrastructure OR LLM",
  },
  {
    id: "data-analytics",
    label: "Data & Analytics",
    description: "Warehouses, BI, pipelines, and the modern data platform.",
    query: "data analytics OR data warehouse",
  },
  {
    id: "healthtech",
    label: "Health Tech",
    description: "Digital health, clinical software, and health data platforms.",
    query: "healthtech OR digital health",
  },
  {
    id: "martech",
    label: "Marketing Tech",
    description: "CRM, automation, analytics, and the marketing software stack.",
    query: "marketing software OR martech",
  },
  {
    id: "hrtech",
    label: "HR Tech",
    description: "Hiring, payroll, people analytics, and workforce platforms.",
    query: "HR software OR hiring software",
  },
  {
    id: "proptech",
    label: "Prop Tech",
    description: "Real-estate software, property management, and construction tech.",
    query: "proptech OR real estate software",
  },
  {
    id: "edtech",
    label: "Ed Tech",
    description: "Learning platforms, courseware, and education software.",
    query: "edtech OR online learning",
  },
  {
    id: "cloud",
    label: "Cloud & Infra",
    description: "Compute, storage, networking, and cloud platform providers.",
    query: "cloud computing OR kubernetes",
  },
  {
    id: "crypto",
    label: "Crypto & Web3",
    description: "Digital assets, exchanges, wallets, and blockchain infrastructure.",
    query: "crypto OR blockchain",
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "Studios, engines, distribution, and interactive entertainment.",
    query: "gaming OR game studio",
  },
  {
    id: "robotics",
    label: "Robotics & Automation",
    description: "Industrial and service robotics, automation, and hardware.",
    query: "robotics OR automation",
  },
  {
    id: "biotech",
    label: "Biotech",
    description: "Drug discovery, lab software, and life-sciences platforms.",
    query: "biotech OR drug discovery",
  },
  {
    id: "climate",
    label: "Climate Tech",
    description: "Energy, carbon, and sustainability technology.",
    query: "climate tech OR clean energy",
  },
  {
    id: "logistics",
    label: "Logistics & Supply Chain",
    description: "Freight, fulfillment, and supply-chain software.",
    query: "logistics software OR supply chain",
  },
  {
    id: "legaltech",
    label: "Legal Tech",
    description: "Contract, compliance, and practice-management software.",
    query: "legal tech OR contract software",
  },
].map(makePack);
