import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getDb, authenticate, isEntitled, type AuthContext } from "@bellwether/db";
import { planLimit, roleAllows, type Role } from "@bellwether/core";
import { RateLimiter } from "./ratelimit.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

const limiter = new RateLimiter();

/**
 * Global onRequest hook: if a Bearer key is present, authenticate it, attach the
 * org context, and rate-limit by plan. Absent key = anonymous (read-only public
 * endpoints still work — set REQUIRE_AUTH=true to lock everything down). An
 * invalid key is rejected outright.
 */
export function registerAuth(app: FastifyInstance) {
  app.decorateRequest("auth", undefined);

  app.addHook("onRequest", async (req, reply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      if (process.env.REQUIRE_AUTH === "true" && !isPublicPath(req.url)) {
        return reply.code(401).send({ error: "API key required" });
      }
      return;
    }
    const secret = header.slice("Bearer ".length).trim();
    const ctx = await authenticate(getDb(), secret);
    if (!ctx) return reply.code(401).send({ error: "invalid or revoked API key" });

    const { allowed, remaining } = limiter.check(ctx.orgId, planLimit(ctx.plan).rpm);
    reply.header("x-ratelimit-remaining", String(remaining));
    if (!allowed) return reply.code(429).send({ error: "rate limit exceeded" });

    req.auth = ctx;
  });
}

function isPublicPath(url: string): boolean {
  return url === "/health" || url.startsWith("/signup");
}

/** Guard: require an authenticated caller with at least `role`. */
export function requireRole(role: Role) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.auth) return reply.code(401).send({ error: "API key required" });
    if (!roleAllows(req.auth.role, role)) {
      return reply.code(403).send({ error: `requires ${role} role` });
    }
  };
}

/** Guard: caller's org must be entitled to the industry (subscription scope). */
export async function requireEntitlement(
  req: FastifyRequest,
  reply: FastifyReply,
  industryId: string,
): Promise<boolean> {
  if (!req.auth) {
    reply.code(401).send({ error: "API key required" });
    return false;
  }
  if (!(await isEntitled(getDb(), req.auth.orgId, industryId))) {
    reply.code(403).send({ error: `org not subscribed to "${industryId}"` });
    return false;
  }
  return true;
}
