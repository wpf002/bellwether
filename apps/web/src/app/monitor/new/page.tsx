"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE, api } from "@/lib/api";
import type { Monitor, MonitorCompetitor, MonitorSource } from "@/lib/api";

const INDUSTRIES = [
  { id: "saas", label: "B2B SaaS" },
  { id: "ecommerce", label: "E-commerce & Retail" },
  { id: "fintech", label: "Fintech & Payments" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "devtools", label: "Developer Tools" },
  { id: "ai-infra", label: "AI Infrastructure" },
  { id: "data-analytics", label: "Data & Analytics" },
  { id: "healthtech", label: "Health" },
  { id: "martech", label: "Marketing" },
  { id: "hrtech", label: "HR" },
  { id: "proptech", label: "Real Estate & Property" },
  { id: "edtech", label: "Education" },
  { id: "cloud", label: "Cloud & Infra" },
  { id: "crypto", label: "Crypto & Web3" },
  { id: "gaming", label: "Gaming" },
  { id: "robotics", label: "Robotics & Automation" },
  { id: "biotech", label: "Biotech" },
  { id: "climate", label: "Climate" },
  { id: "logistics", label: "Logistics & Supply Chain" },
  { id: "legaltech", label: "Legal" },
];

type SourcePreset = {
  kind: "publication" | "keyword" | "influencer";
  label: string;
  placeholder: string;
  description: string;
  toSource: (value: string, label: string) => { label: string; kind: string; adapter: string; url: string; extractAs: string[] };
};

const SOURCE_PRESETS: SourcePreset[] = [
  {
    kind: "keyword",
    label: "Keyword / Topic",
    placeholder: "e.g. enterprise HR software",
    description: "Monitors Hacker News for stories about this keyword (≥5 points)",
    toSource: (kw, label) => ({
      label: label || `HN: ${kw}`,
      kind: "social_public",
      adapter: "hn-algolia",
      url: `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(kw)}&tags=story&numericFilters=points%3E%3D5&hitsPerPage=20`,
      extractAs: ["sentiment_theme", "company"],
    }),
  },
  {
    kind: "publication",
    label: "Trade Publication / RSS",
    placeholder: "https://example.com/feed.xml",
    description: "Any RSS or Atom feed — trade press, vendor blog, newsletter",
    toSource: (url, label) => ({
      label: label || new URL(url).hostname,
      kind: "rss",
      adapter: "rss-news",
      url,
      extractAs: ["market_event", "company"],
    }),
  },
  {
    kind: "influencer",
    label: "Newsletter / Substack / Blog",
    placeholder: "https://author.substack.com/feed",
    description: "Substack, Ghost, or any personal blog with an RSS feed",
    toSource: (url, label) => ({
      label: label || new URL(url).hostname,
      kind: "rss",
      adapter: "rss-news",
      url,
      extractAs: ["market_event", "sentiment_theme"],
    }),
  },
];

export default function NewMonitorPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=info, 1=competitors, 2=sources
  const [monitor, setMonitor] = useState<Monitor | null>(null);

  // Step 0 state
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [industryId, setIndustryId] = useState("saas");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 state
  const [competitors, setCompetitors] = useState<MonitorCompetitor[]>([]);
  const [compName, setCompName] = useState("");
  const [compDomain, setCompDomain] = useState("");

  // Step 2 state
  const [sources, setSources] = useState<MonitorSource[]>([]);
  const [srcPreset, setSrcPreset] = useState(0);
  const [srcValue, setSrcValue] = useState("");
  const [srcLabel, setSrcLabel] = useState("");
  const [srcAdding, setSrcAdding] = useState(false);

  // ---- Step 0: create monitor ----
  async function handleCreateMonitor() {
    if (!name.trim()) { setError("Company name is required"); return; }
    setSaving(true); setError("");
    try {
      const m = await api.createMonitor({ name: name.trim(), domain: domain.trim() || undefined, description: description.trim() || undefined, industryId });
      setMonitor(m);
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ---- Step 1: competitors ----
  async function handleAddCompetitor() {
    if (!compName.trim() || !monitor) return;
    const c = await api.addCompetitor(monitor.id, { name: compName.trim(), domain: compDomain.trim() || undefined });
    setCompetitors((prev) => [...prev, c]);
    setCompName(""); setCompDomain("");
  }

  // ---- Step 2: sources ----
  async function handleAddSource() {
    if (!srcValue.trim() || !monitor) return;
    setSrcAdding(true);
    try {
      const preset = SOURCE_PRESETS[srcPreset]!;
      let sourceBody: ReturnType<typeof preset.toSource>;
      try {
        sourceBody = preset.toSource(srcValue.trim(), srcLabel.trim());
      } catch {
        setError("Invalid URL — please include https://");
        setSrcAdding(false);
        return;
      }
      const s = await api.addMonitorSource(monitor.id, sourceBody);
      setSources((prev) => [...prev, s]);
      setSrcValue(""); setSrcLabel(""); setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSrcAdding(false);
    }
  }

  const STEPS = ["Company Info", "Competitors", "Signal Sources"];

  return (
    <main className="mx-auto max-w-2xl">
      <Link href="/monitor" className="text-sm text-ink-400 hover:text-brand-600">
        ← Monitors
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">New Monitor</h1>

      {/* Step indicator */}
      <div className="mt-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i < step ? "bg-brand-600 text-white" : i === step ? "bg-brand-100 text-brand-700 ring-1 ring-brand-400" : "bg-surface-200 text-ink-400"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-semibold text-ink" : "text-ink-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-surface-300" />}
          </div>
        ))}
      </div>

      <div className="card mt-6 p-6">
        {/* ---- Step 0: company info ---- */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Company name <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Domain</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="acme.com"
                className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this company do?"
                rows={2}
                className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Base industry</label>
              <p className="text-xs text-ink-400 mb-2">Industry signals will be filtered to this company's name automatically.</p>
              <select
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
                className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.label}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreateMonitor}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Next: Add Competitors →"}
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 1: competitors ---- */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Designate competitors — signals mentioning these companies will appear in your monitor feed.
            </p>

            {competitors.length > 0 && (
              <div className="space-y-2">
                {competitors.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2">
                    {c.domain && (
                      <img src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=16`} alt="" className="h-4 w-4 rounded" />
                    )}
                    <span className="flex-1 text-sm font-medium text-ink">{c.name}</span>
                    {c.domain && <span className="text-xs text-ink-400">{c.domain}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
                placeholder="Competitor name"
                className="flex-1 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
              <input
                value={compDomain}
                onChange={(e) => setCompDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
                placeholder="domain.com (optional)"
                className="w-44 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
              <button
                onClick={handleAddCompetitor}
                disabled={!compName.trim()}
                className="rounded-lg bg-surface-200 px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface-300 disabled:opacity-40"
              >
                Add
              </button>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="text-sm text-ink-400 hover:text-ink">← Back</button>
              <button
                onClick={() => setStep(2)}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Next: Add Sources →
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 2: signal sources ---- */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Add hyper-specific signal sources — trade publications, keywords, influencer newsletters. Each gets scraped daily.
            </p>

            {/* Source type tabs */}
            <div className="flex gap-1 rounded-lg bg-surface-100 p-1">
              {SOURCE_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setSrcPreset(i); setSrcValue(""); setSrcLabel(""); setError(""); }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    srcPreset === i ? "bg-white text-brand-700 shadow-sm" : "text-ink-400 hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-ink-400">{SOURCE_PRESETS[srcPreset]!.description}</p>

            <div className="space-y-2">
              <input
                value={srcValue}
                onChange={(e) => setSrcValue(e.target.value)}
                placeholder={SOURCE_PRESETS[srcPreset]!.placeholder}
                className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
              <input
                value={srcLabel}
                onChange={(e) => setSrcLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
              <button
                onClick={handleAddSource}
                disabled={!srcValue.trim() || srcAdding}
                className="w-full rounded-lg border border-brand-300 bg-brand-50 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-40"
              >
                {srcAdding ? "Adding…" : "+ Add Source"}
              </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {sources.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Added sources</p>
                {sources.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2">
                    <span className="text-xs font-medium text-ink">{s.label}</span>
                    <span className="ml-auto rounded bg-surface-200 px-1.5 py-0.5 text-xs text-ink-400">{s.kind}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="text-sm text-ink-400 hover:text-ink">← Back</button>
              <button
                onClick={() => monitor && router.push(`/monitor/${monitor.id}`)}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Open Monitor Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
