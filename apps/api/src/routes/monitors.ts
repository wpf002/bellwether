import type { FastifyInstance } from "fastify";
import { getDb, schema, listMonitors, getMonitor, createMonitor, updateMonitor, deleteMonitor, addCompetitor, removeCompetitor, addMonitorSource, removeMonitorSource, monitorSignals } from "@bellwether/db";
import { getScrapeQueue } from "../queue-client.js";
import { eq } from "drizzle-orm";

/**
 * Monitor Mode routes — single-entity intelligence on top of the industry pipeline.
 * All write operations also sync monitor sources into the `sources` table so the
 * existing scrape/extract worker handles them without code changes.
 */
export async function monitorRoutes(app: FastifyInstance) {
  const db = getDb();

  // ---- CRUD ----

  app.get("/monitors", async (req) => {
    const orgId = (req as unknown as { auth?: { orgId?: string } }).auth?.orgId;
    return listMonitors(db, orgId);
  });

  app.post<{ Body: { name: string; domain?: string; description?: string; industryId?: string } }>(
    "/monitors",
    async (req, reply) => {
      const orgId = (req as unknown as { auth?: { orgId?: string } }).auth?.orgId;
      if (!req.body.name?.trim()) return reply.code(400).send({ error: "name required" });
      const monitor = await createMonitor(db, { ...req.body, orgId });
      return reply.code(201).send(monitor);
    },
  );

  app.get<{ Params: { id: string } }>("/monitors/:id", async (req, reply) => {
    const monitor = await getMonitor(db, req.params.id);
    if (!monitor) return reply.code(404).send({ error: "not found" });
    return monitor;
  });

  app.patch<{ Params: { id: string }; Body: { name?: string; domain?: string; description?: string; industryId?: string } }>(
    "/monitors/:id",
    async (req, reply) => {
      const updated = await updateMonitor(db, req.params.id, req.body);
      if (!updated) return reply.code(404).send({ error: "not found" });
      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>("/monitors/:id", async (req, reply) => {
    // Also remove any sources from the `sources` table
    const monitor = await getMonitor(db, req.params.id);
    if (!monitor) return reply.code(404).send({ error: "not found" });

    for (const ms of monitor.sources) {
      const sourceId = `ms-${monitor.id}-${ms.id}`;
      await db.delete(schema.sources).where(eq(schema.sources.id, sourceId));
    }
    await deleteMonitor(db, req.params.id);
    return reply.code(204).send();
  });

  // ---- competitors ----

  app.post<{ Params: { id: string }; Body: { name: string; domain?: string } }>(
    "/monitors/:id/competitors",
    async (req, reply) => {
      const monitor = await getMonitor(db, req.params.id);
      if (!monitor) return reply.code(404).send({ error: "not found" });
      if (!req.body.name?.trim()) return reply.code(400).send({ error: "name required" });
      const competitor = await addCompetitor(db, req.params.id, req.body);
      return reply.code(201).send(competitor);
    },
  );

  app.delete<{ Params: { id: string; cId: string } }>(
    "/monitors/:id/competitors/:cId",
    async (req, reply) => {
      const ok = await removeCompetitor(db, req.params.cId);
      if (!ok) return reply.code(404).send({ error: "not found" });
      return reply.code(204).send();
    },
  );

  // ---- custom sources ----

  app.post<{
    Params: { id: string };
    Body: { label: string; kind: string; adapter: string; url: string; extractAs?: string[] };
  }>("/monitors/:id/sources", async (req, reply) => {
    const monitor = await getMonitor(db, req.params.id);
    if (!monitor) return reply.code(404).send({ error: "not found" });

    const { label, kind, adapter, url, extractAs } = req.body;
    if (!label || !adapter || !url) return reply.code(400).send({ error: "label, adapter, url required" });

    const ms = await addMonitorSource(db, req.params.id, { label, kind: kind ?? "rss", adapter, url, extractAs });

    // Sync into the `sources` table so the scrape worker picks it up
    const sourceId = `ms-${monitor.id}-${ms.id}`;
    const industryId = monitor.industryId ?? "saas"; // fallback to saas if no base industry
    await db
      .insert(schema.sources)
      .values({
        id: sourceId,
        industryId,
        label: ms.label,
        kind: ms.kind,
        adapter: ms.adapter,
        url: ms.url,
      })
      .onConflictDoUpdate({
        target: schema.sources.id,
        set: { label: ms.label, url: ms.url, adapter: ms.adapter },
      });

    // Enqueue an immediate scrape so the user sees results today
    await getScrapeQueue().add("scrape", { industryId, sourceId });

    app.log.info(`[monitor] source ${sourceId} added + immediate scrape enqueued`);
    return reply.code(201).send({ ...ms, _sourceId: sourceId });
  });

  app.delete<{ Params: { id: string; sId: string } }>(
    "/monitors/:id/sources/:sId",
    async (req, reply) => {
      const monitor = await getMonitor(db, req.params.id);
      if (!monitor) return reply.code(404).send({ error: "not found" });

      const sourceId = `ms-${monitor.id}-${req.params.sId}`;
      await db.delete(schema.sources).where(eq(schema.sources.id, sourceId));
      const ok = await removeMonitorSource(db, req.params.sId);
      if (!ok) return reply.code(404).send({ error: "not found" });
      return reply.code(204).send();
    },
  );

  // ---- signals ----

  app.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string; kind?: string };
  }>("/monitors/:id/signals", async (req, reply) => {
    const monitor = await getMonitor(db, req.params.id);
    if (!monitor) return reply.code(404).send({ error: "not found" });

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    const result = await monitorSignals(db, monitor, {
      limit,
      offset,
      kind: req.query.kind,
    });
    return { monitor: { id: monitor.id, name: monitor.name }, ...result };
  });
}
