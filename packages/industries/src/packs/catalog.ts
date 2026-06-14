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
    label: "Most Mentioned",
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

/** Shared market-event taxonomy guide — defines each kind so the model rarely
 *  falls back to "other". Reused across packs to keep classification consistent. */
export const EVENT_KIND_GUIDE =
  "product_launch (a new product or service released), product_update (a feature or update to an existing product), pricing_change (a price, plan, or packaging change), funding (a fundraising round or investment), acquisition (a merger or acquisition), partnership (an integration, alliance, or notable customer deployment), expansion (entering a new market/region, opening offices, or major hiring), leadership_change (an executive hire or departure), layoffs (job cuts or restructuring), earnings (financial results, revenue/ARR milestones, or valuation), regulatory (a government rule, policy, or compliance mandate), legal (a lawsuit, settlement, antitrust, or IP dispute), security_incident (a breach, ransomware, outage, or vulnerability), research (a report, study, survey, benchmark, market data, or a 'best/top' roundup), analysis (opinion, commentary, predictions, or trend pieces), guide (a how-to, tutorial, tips, FAQ, or playbook), campaign (a marketing campaign, ad, or brand move).";

function prompts(label: string): ExtractionPrompt[] {
  return [
    {
      id: "company",
      entityKind: "company",
      system: `Extract EVERY ${label} company/vendor named in the text as an array — each an organization that sells a product or service in this space (NOT a product, feature, event, or funding round). Return { "companies": [ { "name", "domain", "positioning", "pricingTiers": [], "features": [] } ] } with one entry per distinct company; include only fields the text states. Empty array if none.`,
    },
    {
      id: "sentiment",
      entityKind: "sentiment_theme",
      system: `Extract one recurring buyer/user sentiment theme and its polarity (positive|neutral|negative) from the discussion text about ${label}. Do not weight or score importance. JSON keys: theme, polarity.`,
    },
    {
      id: "event",
      entityKind: "market_event",
      system: `Classify the ${label} text as ONE market event. Pick the SINGLE best kind: ${EVENT_KIND_GUIDE} Use "other" ONLY when nothing above fits. JSON keys: kind, headline, occurredAt (the date it happened if stated, else null).`,
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
  /** Industry Dive trade-news site, e.g. "bankingdive" → bankingdive.com/feeds/news/. */
  diveSite?: string;
  /** Display name for the Industry Dive feed, e.g. "Banking Dive". */
  diveName?: string;
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

  // Authoritative trade-news feed (Industry Dive) — names many real companies,
  // so it's the deepest single source of company + market_event signal per
  // vertical. All Industry Dive feeds are robots-permitted (verified).
  if (o.diveSite) {
    sources.push({
      id: `${o.id}-dive`,
      label: o.diveName ?? `${o.label} trade news`,
      kind: "rss",
      adapter: "rss-news",
      url: `https://www.${o.diveSite}.com/feeds/news/`,
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
    diveSite: "bankingdive",
    diveName: "Banking Dive",
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    description: "Security platforms, threat detection, identity, and compliance tooling.",
    queries: ["cybersecurity", "data breach", "ransomware"],
    tcTag: "cybersecurity",
    diveSite: "cybersecuritydive",
    diveName: "Cybersecurity Dive",
  },
  {
    id: "devtools",
    label: "Developer Tools",
    description: "IDEs, CI/CD, observability, and the software development toolchain.",
    queries: ["developer tools", "CI/CD", "observability"],
    diveSite: "ciodive",
    diveName: "CIO Dive",
  },
  {
    id: "ai-infra",
    label: "AI Infrastructure",
    description: "Foundation models, inference, vector databases, and the AI stack.",
    queries: ["LLM inference", "AI infrastructure", "vector database"],
    tcTag: "artificial-intelligence",
    diveSite: "ciodive",
    diveName: "CIO Dive",
  },
  {
    id: "data-analytics",
    label: "Data & Analytics",
    description: "Warehouses, BI, pipelines, and the modern data platform.",
    queries: ["data warehouse", "business intelligence", "data pipeline"],
    tcTag: "enterprise",
    diveSite: "ciodive",
    diveName: "CIO Dive",
  },
  {
    id: "healthtech",
    label: "Health",
    description: "Digital health, clinical software, and health data platforms.",
    queries: ["digital health", "healthtech", "telemedicine"],
    tcTag: "health",
    diveSite: "healthcaredive",
    diveName: "Healthcare Dive",
  },
  {
    id: "martech",
    label: "Marketing",
    description: "CRM, automation, analytics, and the marketing software stack.",
    queries: ["marketing software", "CRM platform", "marketing automation"],
    tcTag: "marketing-tech",
    diveSite: "marketingdive",
    diveName: "Marketing Dive",
  },
  {
    id: "hrtech",
    label: "HR",
    description: "Hiring, payroll, people analytics, and workforce platforms.",
    queries: [
      "HR software",
      "hiring software",
      "payroll software",
      "applicant tracking",
      "people analytics",
    ],
    diveSite: "hrdive",
    diveName: "HR Dive",
  },
  {
    id: "proptech",
    label: "Real Estate & Property",
    description: "Real-estate software, property management, and construction tech.",
    queries: [
      "proptech",
      "real estate software",
      "property management software",
      "construction tech",
      "real estate startup",
    ],
    diveSite: "constructiondive",
    diveName: "Construction Dive",
  },
  {
    id: "edtech",
    label: "Education",
    description: "Learning platforms, courseware, and education software.",
    queries: ["edtech", "online learning platform", "education software"],
    tcTag: "edtech",
    diveSite: "highereddive",
    diveName: "Higher Ed Dive",
  },
  {
    id: "cloud",
    label: "Cloud & Infra",
    description: "Compute, storage, networking, and cloud platform providers.",
    queries: ["cloud computing", "kubernetes", "serverless"],
    tcTag: "cloud-computing",
    diveSite: "ciodive",
    diveName: "CIO Dive",
  },
  {
    id: "crypto",
    label: "Crypto & Web3",
    description: "Digital assets, exchanges, wallets, and blockchain infrastructure.",
    queries: ["crypto exchange", "blockchain", "stablecoin"],
    tcTag: "crypto",
    diveSite: "bankingdive",
    diveName: "Banking Dive",
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
    diveSite: "manufacturingdive",
    diveName: "Manufacturing Dive",
  },
  {
    id: "biotech",
    label: "Biotech",
    description: "Drug discovery, lab software, and life-sciences platforms.",
    queries: ["biotech", "drug discovery", "genomics"],
    tcTag: "biotech",
    diveSite: "biopharmadive",
    diveName: "BioPharma Dive",
  },
  {
    id: "climate",
    label: "Climate",
    description: "Energy, carbon, and sustainability technology.",
    queries: ["climate tech", "clean energy", "carbon capture"],
    tcTag: "climate",
    diveSite: "utilitydive",
    diveName: "Utility Dive",
  },
  {
    id: "logistics",
    label: "Logistics & Supply Chain",
    description: "Freight, fulfillment, and supply-chain software.",
    queries: [
      "logistics software",
      "supply chain",
      "freight tech",
      "warehouse automation",
      "last mile delivery",
    ],
    diveSite: "supplychaindive",
    diveName: "Supply Chain Dive",
  },
  {
    id: "legaltech",
    label: "Legal",
    description: "Contract, compliance, and practice-management software.",
    queries: ["legal tech", "contract software", "compliance software", "legal AI", "e-discovery"],
    diveSite: "legaldive",
    diveName: "Legal Dive",
  },
].map(makePack);
