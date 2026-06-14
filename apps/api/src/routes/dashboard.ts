import type { FastifyInstance } from "fastify";
import { getDb, sourceHealth } from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";
import { companiesView, digestForWindow, eventsFeed, overview } from "../data.js";

const DAYS = (q: unknown): number => {
  const n = Number((q as { days?: string } | undefined)?.days);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 365) : 7;
};

/** Parse a `?companies=a,b,c` competitor watchlist. */
const COMPANIES = (q: unknown): string[] =>
  String((q as { companies?: string } | undefined)?.companies ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Read-only dashboard endpoints (Phase 3). All data carries provenance: every
 *  finding/event/company links back to source records via `citations`/`url`. */
export async function dashboardRoutes(app: FastifyInstance) {
  const guard = (id: string, reply: import("fastify").FastifyReply): boolean => {
    try {
      getIndustryPack(id);
      return true;
    } catch {
      reply.code(404).send({ error: "unknown industry" });
      return false;
    }
  };

  app.get<{ Params: { id: string }; Querystring: { days?: string; companies?: string } }>(
    "/industries/:id/overview",
    async (req, reply) => {
      if (!guard(req.params.id, reply)) return;
      return overview(req.params.id, DAYS(req.query), COMPANIES(req.query));
    },
  );

  app.get<{ Params: { id: string }; Querystring: { days?: string; companies?: string } }>(
    "/industries/:id/digest",
    async (req, reply) => {
      if (!guard(req.params.id, reply)) return;
      return digestForWindow(req.params.id, DAYS(req.query), COMPANIES(req.query));
    },
  );

  app.get<{ Params: { id: string }; Querystring: { limit?: string; companies?: string } }>(
    "/industries/:id/events",
    async (req, reply) => {
      if (!guard(req.params.id, reply)) return;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      return eventsFeed(req.params.id, limit, COMPANIES(req.query));
    },
  );

  app.get<{ Params: { id: string }; Querystring: { days?: string } }>(
    "/industries/:id/companies",
    async (req, reply) => {
      if (!guard(req.params.id, reply)) return;
      return companiesView(req.params.id, DAYS(req.query));
    },
  );

  // Source health & freshness (Phase 4 monitoring surface).
  app.get<{ Params: { id: string } }>("/industries/:id/sources", async (req, reply) => {
    if (!guard(req.params.id, reply)) return;
    return sourceHealth(getDb(), req.params.id);
  });
}
