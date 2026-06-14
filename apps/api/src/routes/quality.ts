import type { FastifyInstance, FastifyReply } from "fastify";
import {
  getDb,
  recordFeedback,
  feedbackSummary,
  sourcePriority,
  computeQualityNow,
  qualityHistory,
  listDigests,
  shipDigest,
  recordAudit,
  type FeedbackKind,
} from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";
import { requireRole, requireEntitlement } from "../auth.js";

const KNOWN_KINDS: FeedbackKind[] = ["useful", "not_useful", "acted"];

function guard(id: string, reply: FastifyReply): boolean {
  try {
    getIndustryPack(id);
    return true;
  } catch {
    reply.code(404).send({ error: "unknown industry" });
    return false;
  }
}

/** Phase 5: feedback loop, quality metric, and the human-review/ship gate. */
export async function qualityRoutes(app: FastifyInstance) {
  // Capture feedback — the raw input to the loop.
  app.post<{
    Body: {
      industryId?: string;
      kind?: string;
      signalId?: string;
      digestId?: string;
      sourceId?: string;
      note?: string;
    };
  }>("/feedback", { preHandler: requireRole("member") }, async (req, reply) => {
    const b = req.body ?? {};
    if (!b.industryId || !guard(b.industryId, reply)) return;
    if (!b.kind || !KNOWN_KINDS.includes(b.kind as FeedbackKind)) {
      return reply.code(400).send({ error: `kind must be one of ${KNOWN_KINDS.join(", ")}` });
    }
    if (!(await requireEntitlement(req, reply, b.industryId))) return;
    const id = await recordFeedback(getDb(), {
      industryId: b.industryId,
      kind: b.kind as FeedbackKind,
      signalId: b.signalId,
      digestId: b.digestId,
      sourceId: b.sourceId,
      note: b.note,
    });
    await recordAudit(getDb(), {
      orgId: req.auth!.orgId,
      actor: req.auth!.keyPrefix,
      action: "feedback.create",
      target: b.industryId,
      detail: { kind: b.kind },
    });
    return reply.code(201).send({ id });
  });

  app.get<{ Params: { id: string } }>("/industries/:id/feedback", async (req, reply) => {
    if (!guard(req.params.id, reply)) return;
    return feedbackSummary(getDb(), req.params.id);
  });

  app.get<{ Params: { id: string } }>("/industries/:id/quality", async (req, reply) => {
    if (!guard(req.params.id, reply)) return;
    const db = getDb();
    return {
      now: await computeQualityNow(db, req.params.id),
      history: await qualityHistory(db, req.params.id),
    };
  });

  app.get<{ Params: { id: string } }>("/industries/:id/sources/priority", async (req, reply) => {
    if (!guard(req.params.id, reply)) return;
    return sourcePriority(getDb(), req.params.id);
  });

  app.get<{ Params: { id: string } }>("/industries/:id/digests", async (req, reply) => {
    if (!guard(req.params.id, reply)) return;
    return listDigests(getDb(), req.params.id);
  });

  // The human-review gate: a digest is "draft" until a reviewer ships it (admin+).
  app.post<{ Params: { id: string }; Body: { reviewedBy?: string } }>(
    "/digests/:id/ship",
    { preHandler: requireRole("admin") },
    async (req, reply) => {
      const ok = await shipDigest(getDb(), req.params.id, req.body?.reviewedBy);
      if (!ok) return reply.code(404).send({ error: "unknown digest" });
      await recordAudit(getDb(), {
        orgId: req.auth!.orgId,
        actor: req.auth!.keyPrefix,
        action: "digest.ship",
        target: req.params.id,
      });
      return { id: req.params.id, status: "shipped" };
    },
  );
}
