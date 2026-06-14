import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  computeMrr,
  orgsByPlan,
  churnRate,
  planLimit,
  type Plan,
  type Role,
} from "@bellwether/core";
import type { Database } from "./client.js";
import * as schema from "./schema.js";

// ---- API keys (pure crypto helpers — testable) ----

export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKey(): { secret: string; prefix: string; hashed: string } {
  const secret = `bw_${randomBytes(24).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 11), hashed: hashApiKey(secret) };
}

// ---- Auth context resolved from a key ----

export interface AuthContext {
  orgId: string;
  orgName: string;
  plan: Plan;
  role: Role;
  keyPrefix: string;
}

/** Resolves an API key secret to its org + role, or null if invalid/revoked. */
export async function authenticate(db: Database, secret: string): Promise<AuthContext | null> {
  const hashed = hashApiKey(secret);
  const [row] = await db
    .select({
      keyId: schema.apiKeys.id,
      prefix: schema.apiKeys.prefix,
      keyRole: schema.apiKeys.role,
      orgId: schema.orgs.id,
      orgName: schema.orgs.name,
      plan: schema.orgs.plan,
      canceledAt: schema.orgs.canceledAt,
    })
    .from(schema.apiKeys)
    .innerJoin(schema.orgs, eq(schema.apiKeys.orgId, schema.orgs.id))
    .where(and(eq(schema.apiKeys.hashedKey, hashed), isNull(schema.apiKeys.revokedAt)));
  if (!row || row.canceledAt) return null;

  await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, row.keyId));

  return {
    orgId: row.orgId,
    orgName: row.orgName,
    plan: row.plan as Plan,
    role: row.keyRole as Role,
    keyPrefix: row.prefix,
  };
}

// ---- Onboarding / account ops ----

export interface SignupResult {
  orgId: string;
  userId: string;
  /** The API key secret — shown ONCE, never stored in plaintext. */
  apiKey: string;
}

/** Creates an org + owner user + owner API key (self-serve onboarding). */
export async function createOrg(
  db: Database,
  input: { orgName: string; email: string; name?: string; plan?: Plan },
): Promise<SignupResult> {
  const orgId = randomUUID();
  const userId = randomUUID();
  const key = generateApiKey();

  await db
    .insert(schema.orgs)
    .values({ id: orgId, name: input.orgName, plan: input.plan ?? "free" });
  await db
    .insert(schema.users)
    .values({ id: userId, email: input.email, name: input.name ?? null })
    .onConflictDoNothing();
  await db.insert(schema.memberships).values({ id: randomUUID(), orgId, userId, role: "owner" });
  await db.insert(schema.apiKeys).values({
    id: randomUUID(),
    orgId,
    hashedKey: key.hashed,
    prefix: key.prefix,
    name: "owner key",
    role: "owner",
  });
  return { orgId, userId, apiKey: key.secret };
}

/** Issues an additional API key for an org. Returns the secret once. */
export async function createApiKey(
  db: Database,
  orgId: string,
  opts: { name?: string; role?: Role } = {},
): Promise<string> {
  const key = generateApiKey();
  await db.insert(schema.apiKeys).values({
    id: randomUUID(),
    orgId,
    hashedKey: key.hashed,
    prefix: key.prefix,
    name: opts.name ?? null,
    role: opts.role ?? "member",
  });
  return key.secret;
}

export async function orgEntitlements(db: Database, orgId: string): Promise<string[]> {
  const rows = await db
    .select({ industryId: schema.subscriptions.industryId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orgId, orgId));
  return rows.map((r) => r.industryId);
}

export async function isEntitled(
  db: Database,
  orgId: string,
  industryId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.subscriptions.id })
    .from(schema.subscriptions)
    .where(
      and(eq(schema.subscriptions.orgId, orgId), eq(schema.subscriptions.industryId, industryId)),
    );
  return Boolean(row);
}

/** Subscribes an org to an industry, enforcing the plan's industry cap. */
export async function subscribe(
  db: Database,
  orgId: string,
  industryId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const [org] = await db
    .select({ plan: schema.orgs.plan })
    .from(schema.orgs)
    .where(eq(schema.orgs.id, orgId));
  if (!org) return { ok: false, reason: "unknown org" };
  const current = await orgEntitlements(db, orgId);
  if (current.includes(industryId)) return { ok: true };
  if (current.length >= planLimit(org.plan).industries) {
    return {
      ok: false,
      reason: `plan "${org.plan}" allows ${planLimit(org.plan).industries} industries`,
    };
  }
  await db
    .insert(schema.subscriptions)
    .values({ id: randomUUID(), orgId, industryId })
    .onConflictDoNothing();
  return { ok: true };
}

export async function recordAudit(
  db: Database,
  entry: { orgId?: string; actor?: string; action: string; target?: string; detail?: unknown },
): Promise<void> {
  await db.insert(schema.auditLog).values({
    id: randomUUID(),
    orgId: entry.orgId ?? null,
    actor: entry.actor ?? null,
    action: entry.action,
    target: entry.target ?? null,
    detail: entry.detail ?? null,
  });
}

// ---- Platform metrics (MRR / churn / coverage) ----

export interface PlatformMetrics {
  mrr: number;
  activeOrgs: number;
  orgsByPlan: Record<string, number>;
  churnRate: number;
  totalSignals: number;
  shippedDigests: number;
}

export async function platformMetrics(db: Database): Promise<PlatformMetrics> {
  const orgRows = await db
    .select({ plan: schema.orgs.plan, canceledAt: schema.orgs.canceledAt })
    .from(schema.orgs);
  const billable = orgRows.map((o) => ({
    plan: o.plan,
    canceledAt: o.canceledAt?.toISOString() ?? null,
  }));

  const [{ n: signalCount } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.signals);
  const [{ n: shipped } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.digests)
    .where(eq(schema.digests.status, "shipped"));

  return {
    mrr: computeMrr(billable),
    activeOrgs: billable.filter((o) => !o.canceledAt).length,
    orgsByPlan: orgsByPlan(billable),
    churnRate: churnRate(billable),
    totalSignals: Number(signalCount),
    shippedDigests: Number(shipped),
  };
}
