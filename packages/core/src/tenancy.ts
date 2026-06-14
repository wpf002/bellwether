/**
 * Phase 6 — plans, roles, and billing math. Pure and centralized so limits and
 * pricing live in one auditable place (and so the metrics surface is testable).
 */

export type Plan = "free" | "pro" | "enterprise";
export type Role = "owner" | "admin" | "member" | "viewer";

export interface PlanLimit {
  /** Requests/min for an org's API keys. */
  rpm: number;
  /** Max industries an org may subscribe to. */
  industries: number;
  /** Monthly price — the basis for MRR. */
  monthlyUsd: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  free: { rpm: 30, industries: 1, monthlyUsd: 0 },
  pro: { rpm: 300, industries: 5, monthlyUsd: 99 },
  enterprise: { rpm: 3000, industries: Number.POSITIVE_INFINITY, monthlyUsd: 499 },
};

export function planLimit(plan: string): PlanLimit {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free;
}

const ROLE_RANK: Record<Role, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

/** True if `have` meets or exceeds the `need` role. */
export function roleAllows(have: string, need: Role): boolean {
  return (ROLE_RANK[have as Role] ?? -1) >= ROLE_RANK[need];
}

export interface BillableOrg {
  plan: string;
  canceledAt: string | null;
}

/** Monthly recurring revenue = sum of active (non-canceled) orgs' plan prices. */
export function computeMrr(orgs: BillableOrg[]): number {
  return orgs
    .filter((o) => !o.canceledAt)
    .reduce((sum, o) => sum + planLimit(o.plan).monthlyUsd, 0);
}

/** Orgs grouped by plan (active only). */
export function orgsByPlan(orgs: BillableOrg[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of orgs) {
    if (o.canceledAt) continue;
    out[o.plan] = (out[o.plan] ?? 0) + 1;
  }
  return out;
}

/** Churn rate = canceled / total (0 when there are no orgs). */
export function churnRate(orgs: BillableOrg[]): number {
  if (orgs.length === 0) return 0;
  return orgs.filter((o) => o.canceledAt).length / orgs.length;
}
