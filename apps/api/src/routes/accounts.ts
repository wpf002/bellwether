import type { FastifyInstance } from "fastify";
import {
  getDb,
  createOrg,
  createApiKey,
  orgEntitlements,
  subscribe,
  recordAudit,
  platformMetrics,
} from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";
import { planLimit, type Plan, type Role } from "@bellwether/core";
import { requireRole } from "../auth.js";

const PLANS: Plan[] = ["free", "pro", "enterprise"];

/** Phase 6: self-serve onboarding, key/subscription management, platform metrics. */
export async function accountRoutes(app: FastifyInstance) {
  // Onboarding — public. Returns the API key ONCE.
  app.post<{ Body: { orgName?: string; email?: string; name?: string; plan?: string } }>(
    "/signup",
    async (req, reply) => {
      const b = req.body ?? {};
      if (!b.orgName || !b.email) {
        return reply.code(400).send({ error: "orgName and email are required" });
      }
      const plan = PLANS.includes(b.plan as Plan) ? (b.plan as Plan) : "free";
      const result = await createOrg(getDb(), {
        orgName: b.orgName,
        email: b.email,
        name: b.name,
        plan,
      });
      await recordAudit(getDb(), { orgId: result.orgId, actor: b.email, action: "org.create" });
      return reply.code(201).send({
        orgId: result.orgId,
        plan,
        apiKey: result.apiKey,
        note: "Store this key now — it is not shown again.",
      });
    },
  );

  // Who am I — requires a valid key.
  app.get("/me", { preHandler: requireRole("viewer") }, async (req) => {
    const auth = req.auth!;
    return {
      orgId: auth.orgId,
      orgName: auth.orgName,
      plan: auth.plan,
      role: auth.role,
      limits: planLimit(auth.plan),
      entitlements: await orgEntitlements(getDb(), auth.orgId),
    };
  });

  // Issue another API key (admin+).
  app.post<{ Body: { name?: string; role?: string } }>(
    "/api-keys",
    { preHandler: requireRole("admin") },
    async (req, reply) => {
      const auth = req.auth!;
      const secret = await createApiKey(getDb(), auth.orgId, {
        name: req.body?.name,
        role: (req.body?.role as Role) ?? "member",
      });
      await recordAudit(getDb(), {
        orgId: auth.orgId,
        actor: auth.keyPrefix,
        action: "apikey.create",
      });
      return reply.code(201).send({ apiKey: secret, note: "Store this key now." });
    },
  );

  // Subscribe the caller's org to an industry (admin+), enforcing plan caps.
  app.post<{ Body: { industryId?: string } }>(
    "/subscriptions",
    { preHandler: requireRole("admin") },
    async (req, reply) => {
      const auth = req.auth!;
      const industryId = req.body?.industryId;
      if (!industryId) return reply.code(400).send({ error: "industryId required" });
      try {
        getIndustryPack(industryId);
      } catch {
        return reply.code(404).send({ error: "unknown industry" });
      }
      const res = await subscribe(getDb(), auth.orgId, industryId);
      if (!res.ok) return reply.code(402).send({ error: res.reason });
      await recordAudit(getDb(), {
        orgId: auth.orgId,
        actor: auth.keyPrefix,
        action: "subscription.create",
        target: industryId,
      });
      return reply.code(201).send({ orgId: auth.orgId, industryId });
    },
  );

  // Platform metrics — gated by a platform admin token (ops surface).
  app.get("/admin/metrics", async (req, reply) => {
    const token = req.headers["x-admin-token"];
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return reply.code(401).send({ error: "admin token required" });
    }
    return platformMetrics(getDb());
  });
}
