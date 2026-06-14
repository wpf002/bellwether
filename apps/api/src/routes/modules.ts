import type { FastifyInstance, FastifyReply } from "fastify";
import { opportunityMap, regulatoryEvents } from "@bellwether/core";
import { getIndustryPack } from "@bellwether/industries";
import { signalsInWindow, urlsForRecords } from "../data.js";

function guard(id: string, reply: FastifyReply): boolean {
  try {
    getIndustryPack(id);
    return true;
  } catch {
    reply.code(404).send({ error: "unknown industry" });
    return false;
  }
}

/** Phase 7 advanced modules — deterministic re-slices of existing signals, each
 *  carrying citations. (Competitive-interaction simulation is intentionally not
 *  here — the roadmap defers it.) */
export async function moduleRoutes(app: FastifyInstance) {
  // Sentiment-driven opportunity map: pain points (gaps) + strengths.
  app.get<{ Params: { id: string }; Querystring: { days?: string } }>(
    "/industries/:id/opportunities",
    async (req, reply) => {
      if (!guard(req.params.id, reply)) return;
      const days = Math.min(Number(req.query.days) || 90, 365);
      const map = opportunityMap(await signalsInWindow(req.params.id, days));
      const ids = [...map.opportunities, ...map.strengths].flatMap((c) => c.sourceRecordIds);
      return { ...map, citations: await urlsForRecords(ids) };
    },
  );

  // Per-industry regulatory/compliance feed.
  app.get<{ Params: { id: string }; Querystring: { days?: string } }>(
    "/industries/:id/regulatory",
    async (req, reply) => {
      if (!guard(req.params.id, reply)) return;
      const days = Math.min(Number(req.query.days) || 180, 365);
      const events = regulatoryEvents(await signalsInWindow(req.params.id, days));
      const citations = await urlsForRecords(events.flatMap((e) => e.sourceRecordIds));
      return { count: events.length, events, citations };
    },
  );
}
