import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Integration test for the DB-touching code that unit tests can't reach. Runs
 * only when TEST_DATABASE_URL points at a migrated Postgres (set in CI via a
 * postgres service; locally `TEST_DATABASE_URL=postgres://... pnpm --filter
 * @bellwether/db test`). Skipped otherwise so the default suite needs no DB.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const IND = `itest_${Math.random().toString(36).slice(2, 8)}`;

describe.skipIf(!TEST_DB)("db integration (real Postgres)", () => {
  beforeAll(async () => {
    const { getDb, schema } = await import("./index.js");
    const db = getDb();
    await db.insert(schema.industries).values({ id: IND, label: "IT", description: "d" });
    await db.insert(schema.sources).values({
      id: `${IND}-s1`,
      industryId: IND,
      label: "S1",
      kind: "rss",
      adapter: "rss-news",
      url: "http://x",
      healthy: 1,
      lastSuccessAt: new Date(),
    });
    await db.insert(schema.rawRecords).values({
      id: `${IND}-r1`,
      sourceId: `${IND}-s1`,
      url: "http://x/1",
      fetchedAt: new Date(),
      contentHash: "h1",
      raw: "raw",
    });
    await db.insert(schema.signals).values([
      {
        id: `${IND}-sig1`,
        industryId: IND,
        entityKind: "company",
        payload: { name: "Acme" },
        sourceRecordIds: [`${IND}-r1`],
        lineage: [],
      },
      {
        id: `${IND}-sig2`,
        industryId: IND,
        entityKind: "market_event",
        payload: { kind: "funding", headline: "Acme raises" },
        sourceRecordIds: [`${IND}-r1`],
        lineage: [],
      },
    ]);
  });

  afterAll(async () => {
    const { getDb, schema, closeDb } = await import("./index.js");
    const db = getDb();
    await db.delete(schema.signals).where(eq(schema.signals.industryId, IND));
    await db.delete(schema.qualitySnapshots).where(eq(schema.qualitySnapshots.industryId, IND));
    await db.delete(schema.feedback).where(eq(schema.feedback.industryId, IND));
    await db.delete(schema.rawRecords).where(eq(schema.rawRecords.sourceId, `${IND}-s1`));
    await db.delete(schema.sources).where(eq(schema.sources.industryId, IND));
    await db.delete(schema.industries).where(eq(schema.industries.id, IND));
    await closeDb();
  });

  it("sourceHealth reflects the inserted source + coverage", async () => {
    const { getDb, sourceHealth } = await import("./index.js");
    const h = await sourceHealth(getDb(), IND);
    expect(h).toHaveLength(1);
    expect(h[0]?.recordCount).toBe(1);
    expect(h[0]?.healthy).toBe(true);
    expect(h[0]?.stale).toBe(false);
  });

  it("computeQualityNow aggregates inserted signals", async () => {
    const { getDb, computeQualityNow } = await import("./index.js");
    const m = await computeQualityNow(getDb(), IND);
    expect(m.signalCount).toBe(2);
    expect(m.citationRate).toBe(1);
    expect(m.byKind).toMatchObject({ company: 1, market_event: 1 });
  });

  it("records feedback and summarizes it", async () => {
    const { getDb, recordFeedback, feedbackSummary } = await import("./index.js");
    await recordFeedback(getDb(), { industryId: IND, kind: "useful", sourceId: `${IND}-s1` });
    expect((await feedbackSummary(getDb(), IND)).useful).toBe(1);
  });

  it("persists and reads back a quality snapshot", async () => {
    const { getDb, computeQualityNow, saveQualitySnapshot, qualityHistory } =
      await import("./index.js");
    await saveQualitySnapshot(getDb(), IND, await computeQualityNow(getDb(), IND));
    expect((await qualityHistory(getDb(), IND)).length).toBeGreaterThan(0);
  });
});
