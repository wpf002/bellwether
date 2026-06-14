/** snake_case / kebab-case → Title Case (e.g. "product_launch" → "Product Launch"). */
export function humanize(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best-effort hostname from a URL (for favicon lookup / display). */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * A company logo URL from a domain (or a source URL). Uses Google's favicon
 * service — no API key, works for any public domain. Returns null if no domain.
 */
export function logoFor(domainOrUrl: string | null | undefined): string | null {
  if (!domainOrUrl) return null;
  const host = domainOrUrl.includes("/") ? hostOf(domainOrUrl) : domainOrUrl.replace(/^www\./, "");
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

/** Capitalize the first letter (leaves the rest as-is). */
export function capitalize(s: string): string {
  const t = s.trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : t;
}

/**
 * Hand-verified name → domain map for well-known companies. The point is logo
 * CORRECTNESS: favicons are only ever shown for a company's real domain, so we
 * never render a wrong logo (e.g. a source publication's icon next to a company).
 * Unknown companies fall back to the LLM-extracted domain, then to initials.
 */
const COMPANY_DOMAINS: Record<string, string> = {
  // Big tech / AI
  meta: "meta.com",
  facebook: "meta.com",
  google: "google.com",
  alphabet: "abc.xyz",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  aws: "aws.amazon.com",
  apple: "apple.com",
  nvidia: "nvidia.com",
  intel: "intel.com",
  ibm: "ibm.com",
  oracle: "oracle.com",
  sap: "sap.com",
  openai: "openai.com",
  anthropic: "anthropic.com",
  "mistral ai": "mistral.ai",
  mistral: "mistral.ai",
  cohere: "cohere.com",
  "hugging face": "huggingface.co",
  perplexity: "perplexity.ai",
  "scale ai": "scale.com",
  databricks: "databricks.com",
  // Dev tools / infra
  github: "github.com",
  gitlab: "gitlab.com",
  atlassian: "atlassian.com",
  jira: "atlassian.com",
  docker: "docker.com",
  hashicorp: "hashicorp.com",
  vercel: "vercel.com",
  netlify: "netlify.com",
  cloudflare: "cloudflare.com",
  datadog: "datadoghq.com",
  "new relic": "newrelic.com",
  grafana: "grafana.com",
  sentry: "sentry.io",
  pagerduty: "pagerduty.com",
  mongodb: "mongodb.com",
  redis: "redis.io",
  elastic: "elastic.co",
  confluent: "confluent.io",
  snowflake: "snowflake.com",
  fivetran: "fivetran.com",
  "dbt labs": "getdbt.com",
  twilio: "twilio.com",
  // SaaS / productivity
  stripe: "stripe.com",
  salesforce: "salesforce.com",
  slack: "slack.com",
  notion: "notion.so",
  linear: "linear.app",
  figma: "figma.com",
  canva: "canva.com",
  miro: "miro.com",
  airtable: "airtable.com",
  asana: "asana.com",
  "monday.com": "monday.com",
  monday: "monday.com",
  dropbox: "dropbox.com",
  box: "box.com",
  docusign: "docusign.com",
  zoom: "zoom.us",
  hubspot: "hubspot.com",
  intercom: "intercom.com",
  zendesk: "zendesk.com",
  freshworks: "freshworks.com",
  mixpanel: "mixpanel.com",
  amplitude: "amplitude.com",
  segment: "segment.com",
  adobe: "adobe.com",
  servicenow: "servicenow.com",
  workday: "workday.com",
  // Security
  crowdstrike: "crowdstrike.com",
  "check point": "checkpoint.com",
  "palo alto networks": "paloaltonetworks.com",
  "palo alto": "paloaltonetworks.com",
  zscaler: "zscaler.com",
  okta: "okta.com",
  sentinelone: "sentinelone.com",
  fortinet: "fortinet.com",
  wiz: "wiz.io",
  snyk: "snyk.io",
  "1password": "1password.com",
  auth0: "auth0.com",
  cisco: "cisco.com",
  // Fintech
  paypal: "paypal.com",
  block: "block.xyz",
  square: "squareup.com",
  plaid: "plaid.com",
  ramp: "ramp.com",
  brex: "brex.com",
  chime: "chime.com",
  robinhood: "robinhood.com",
  klarna: "klarna.com",
  revolut: "revolut.com",
  nubank: "nubank.com.br",
  coinbase: "coinbase.com",
  binance: "binance.com",
  // HR / fintech-adjacent
  gusto: "gusto.com",
  rippling: "rippling.com",
  deel: "deel.com",
  greenhouse: "greenhouse.io",
  lattice: "lattice.com",
  carta: "carta.com",
  // Commerce / consumer
  shopify: "shopify.com",
  walmart: "walmart.com",
  target: "target.com",
  nike: "nike.com",
  uber: "uber.com",
  lyft: "lyft.com",
  airbnb: "airbnb.com",
  doordash: "doordash.com",
  instacart: "instacart.com",
  toast: "toasttab.com",
  tesla: "tesla.com",
  netflix: "netflix.com",
  spotify: "spotify.com",
};

/** Resolve a company's domain: curated map first (verified), then an
 *  LLM-extracted domain, else null (→ caller shows initials, never a wrong logo). */
export function companyDomain(name: string, extracted?: string | null): string | null {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/,?\s+(inc|corp|llc|ltd|co)\.?$/i, "");
  return COMPANY_DOMAINS[key] ?? extracted ?? null;
}

/** Two-letter initials for a logo fallback. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Tailwind classes for an event-kind badge — color-codes the trend feed. */
export function kindStyle(kind: string): string {
  const map: Record<string, string> = {
    product_launch: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    pricing_change: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    funding: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    acquisition: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    leadership_change: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    regulatory: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    campaign: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
    other: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
  return map[kind] ?? map.other!;
}
