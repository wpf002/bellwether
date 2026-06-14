import type { IndustryPack, KpiDef, ExtractionPrompt, SourceDef } from "@bellwether/core";

/**
 * Starter industry catalog. saas + ecommerce are the hand-curated flagship packs
 * (rich first-party + pricing-page sources). The verticals here are generated
 * from a template, but each gets DEPTH: several Hacker News query angles plus a
 * TechCrunch topic feed (all robots-permitted), so every vertical pulls real,
 * cited signals from multiple sources the moment it's scraped. Deepening a
 * vertical further = add curated first-party/pricing sources, like saas — config.
 */

const STANDARD_KPIS: KpiDef[] = [
  {
    id: "share_of_voice",
    label: "Share of Voice (by Company)",
    aggregation: "share_of_voice",
    entityKind: "company",
    field: "name",
  },
  {
    id: "negative_themes",
    label: "Sentiment Mix",
    aggregation: "count",
    entityKind: "sentiment_theme",
    field: "polarity",
  },
  {
    id: "event_mix",
    label: "Event Mix (30d)",
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
  /** HN search angles — each becomes a signal source (events + companies). */
  queries: string[];
  /** TechCrunch tag (techcrunch.com/tag/<tag>/feed/) if one exists for the topic. */
  tcTag?: string;
}): IndustryPack {
  const sources: SourceDef[] = o.queries.map((q, i) => ({
    id: `${o.id}-hn${i + 1}`,
    label: `Hacker News — "${q}"`,
    kind: "rss",
    adapter: "rss-news",
    url: `https://hnrss.org/newest?q=${encodeURIComponent(q)}&points=10`,
    mayContainPersonalData: false,
    extractAs: ["market_event", "company"],
  }));

  if (o.tcTag) {
    sources.push({
      id: `${o.id}-techcrunch`,
      label: `TechCrunch — ${o.label}`,
      kind: "rss",
      adapter: "rss-news",
      url: `https://techcrunch.com/tag/${o.tcTag}/feed/`,
      mayContainPersonalData: false,
      extractAs: ["market_event", "company"],
    });
  }

  // Lower-bar HN feed for community sentiment.
  sources.push({
    id: `${o.id}-discussion`,
    label: `Hacker News — ${o.label} discussion`,
    kind: "social_public",
    adapter: "rss-news",
    url: `https://hnrss.org/newest?q=${encodeURIComponent(o.queries[0] ?? o.label)}&points=2`,
    mayContainPersonalData: true,
    extractAs: ["sentiment_theme"],
  });

  return {
    id: o.id,
    label: o.label,
    version: "0.2.0",
    description: o.description,
    entityKinds: ["company", "sentiment_theme", "market_event"],
    sources,
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
    queries: ["fintech", "payments startup", "neobank"],
    tcTag: "fintech",
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    description: "Security platforms, threat detection, identity, and compliance tooling.",
    queries: ["cybersecurity", "data breach", "ransomware"],
    tcTag: "cybersecurity",
  },
  {
    id: "devtools",
    label: "Developer Tools",
    description: "IDEs, CI/CD, observability, and the software development toolchain.",
    queries: ["developer tools", "CI/CD", "observability"],
  },
  {
    id: "ai-infra",
    label: "AI Infrastructure",
    description: "Foundation models, inference, vector databases, and the AI stack.",
    queries: ["LLM inference", "AI infrastructure", "vector database"],
    tcTag: "artificial-intelligence",
  },
  {
    id: "data-analytics",
    label: "Data & Analytics",
    description: "Warehouses, BI, pipelines, and the modern data platform.",
    queries: ["data warehouse", "business intelligence", "data pipeline"],
    tcTag: "enterprise",
  },
  {
    id: "healthtech",
    label: "Health Tech",
    description: "Digital health, clinical software, and health data platforms.",
    queries: ["digital health", "healthtech", "telemedicine"],
    tcTag: "health",
  },
  {
    id: "martech",
    label: "Marketing Tech",
    description: "CRM, automation, analytics, and the marketing software stack.",
    queries: ["marketing software", "CRM platform", "marketing automation"],
    tcTag: "marketing-tech",
  },
  {
    id: "hrtech",
    label: "HR Tech",
    description: "Hiring, payroll, people analytics, and workforce platforms.",
    queries: ["HR software", "hiring software", "payroll software"],
  },
  {
    id: "proptech",
    label: "Prop Tech",
    description: "Real-estate software, property management, and construction tech.",
    queries: ["proptech", "real estate software", "property management software"],
  },
  {
    id: "edtech",
    label: "Ed Tech",
    description: "Learning platforms, courseware, and education software.",
    queries: ["edtech", "online learning platform", "education software"],
    tcTag: "edtech",
  },
  {
    id: "cloud",
    label: "Cloud & Infra",
    description: "Compute, storage, networking, and cloud platform providers.",
    queries: ["cloud computing", "kubernetes", "serverless"],
    tcTag: "cloud-computing",
  },
  {
    id: "crypto",
    label: "Crypto & Web3",
    description: "Digital assets, exchanges, wallets, and blockchain infrastructure.",
    queries: ["crypto exchange", "blockchain", "stablecoin"],
    tcTag: "crypto",
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "Studios, engines, distribution, and interactive entertainment.",
    queries: ["game studio", "game engine", "gaming platform"],
    tcTag: "gaming",
  },
  {
    id: "robotics",
    label: "Robotics & Automation",
    description: "Industrial and service robotics, automation, and hardware.",
    queries: ["robotics", "industrial automation", "autonomous robots"],
    tcTag: "robotics",
  },
  {
    id: "biotech",
    label: "Biotech",
    description: "Drug discovery, lab software, and life-sciences platforms.",
    queries: ["biotech", "drug discovery", "genomics"],
    tcTag: "biotech",
  },
  {
    id: "climate",
    label: "Climate Tech",
    description: "Energy, carbon, and sustainability technology.",
    queries: ["climate tech", "clean energy", "carbon capture"],
    tcTag: "climate",
  },
  {
    id: "logistics",
    label: "Logistics & Supply Chain",
    description: "Freight, fulfillment, and supply-chain software.",
    queries: ["logistics software", "supply chain", "freight tech"],
  },
  {
    id: "legaltech",
    label: "Legal Tech",
    description: "Contract, compliance, and practice-management software.",
    queries: ["legal tech", "contract software", "compliance software"],
  },
].map(makePack);
