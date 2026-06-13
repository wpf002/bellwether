import type { Signal } from "./signal.js";
import type { IndustryPack, KpiDef } from "./industry.js";
import type { EntityKind } from "./entities.js";

/**
 * The KPI engine: deterministic aggregations over signals, driven entirely by a
 * pack's declarative `KpiDef`s. No LLM, no per-industry code — the model already
 * did its one job (extraction) upstream; magnitudes come from counting and
 * arithmetic over the resulting provenance. This is the discipline that keeps
 * judgment out of the model (see entities.ts / README).
 */

export type KpiValue = number | Record<string, number> | string | null;

export interface KpiResult {
  id: string;
  label: string;
  aggregation: KpiDef["aggregation"];
  entityKind: EntityKind;
  field?: string;
  value: KpiValue;
}

function ofKind(signals: Signal[], kind: EntityKind): Signal[] {
  return signals.filter((s) => s.entityKind === kind);
}

/** Counts signals grouped by the string value of `field`. */
function countByField(signals: Signal[], field: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of signals) {
    const raw = s.payload[field];
    if (raw == null) continue;
    const key = String(raw);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Numeric values of `field` across signals (non-numeric/missing dropped). */
function numbers(signals: Signal[], field: string): number[] {
  const out: number[] = [];
  for (const s of signals) {
    const v = s.payload[field];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** Computes a single KPI over the period's signals. Pure and replayable. */
export function computeKpi(def: KpiDef, signals: Signal[]): KpiResult {
  const scoped = ofKind(signals, def.entityKind);
  const base = {
    id: def.id,
    label: def.label,
    aggregation: def.aggregation,
    entityKind: def.entityKind,
    field: def.field,
  };

  let value: KpiValue;
  switch (def.aggregation) {
    case "count":
      value = def.field ? countByField(scoped, def.field) : scoped.length;
      break;
    case "share_of_voice": {
      // Distribution of mentions across the values of `field`, as fractions.
      const counts = def.field ? countByField(scoped, def.field) : {};
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      value =
        total === 0
          ? {}
          : Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n / total]));
      break;
    }
    case "mean": {
      const ns = def.field ? numbers(scoped, def.field) : [];
      value = ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
      break;
    }
    case "min": {
      const ns = def.field ? numbers(scoped, def.field) : [];
      value = ns.length ? Math.min(...ns) : null;
      break;
    }
    case "max": {
      const ns = def.field ? numbers(scoped, def.field) : [];
      value = ns.length ? Math.max(...ns) : null;
      break;
    }
    case "latest": {
      const sorted = [...scoped].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const top = sorted[0];
      const raw: unknown = top ? (def.field ? top.payload[def.field] : top.id) : null;
      value =
        raw == null ? null : typeof raw === "number" || typeof raw === "string" ? raw : String(raw);
      break;
    }
    default:
      value = null;
  }
  return { ...base, value };
}

/** Computes every KPI declared by a pack over the given signals. */
export function computeKpis(pack: IndustryPack, signals: Signal[]): KpiResult[] {
  return pack.kpis.map((def) => computeKpi(def, signals));
}
