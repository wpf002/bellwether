import type { FastifyInstance } from "fastify";
import { listIndustryPacks, getIndustryPack } from "@bellwether/industries";

export async function industryRoutes(app: FastifyInstance) {
  // List available verticals (drives the "choose an industry" picker).
  app.get("/industries", async () => {
    return listIndustryPacks().map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      sourceCount: p.sources.length,
      kpis: p.kpis.map((k) => ({ id: k.id, label: k.label })),
    }));
  });

  app.get<{ Params: { id: string } }>("/industries/:id", async (req, reply) => {
    try {
      return getIndustryPack(req.params.id);
    } catch {
      return reply.code(404).send({ error: "unknown industry" });
    }
  });
}
