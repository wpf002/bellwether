import { getDb, computeQualityNow, saveQualitySnapshot } from "@bellwether/db";
import type { QualityMetric } from "@bellwether/core";
import { getIndustryPack } from "@bellwether/industries";

/**
 * Computes the current per-industry quality metric and persists it as a
 * snapshot. Run on a cadence (e.g. weekly, after the digest) so quality is
 * trendable over time — the Phase 5 exit criterion.
 */
export async function snapshotQuality(industryId: string): Promise<QualityMetric> {
  getIndustryPack(industryId);
  const db = getDb();
  const metric = await computeQualityNow(db, industryId);
  await saveQualitySnapshot(db, industryId, metric);
  return metric;
}

// CLI: `node dist/quality.js <industryId>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const industryId = process.argv[2];
  const run = async () => {
    if (!industryId) {
      console.error("Usage: snapshot-quality <industryId>");
      process.exitCode = 1;
      return;
    }
    const m = await snapshotQuality(industryId);
    console.log(
      `[quality] ${industryId}: ${m.signalCount} signals, ` +
        `citation ${Math.round(m.citationRate * 100)}%, coverage ${Math.round(m.coverage * 100)}%, ` +
        `useful ${m.usefulRate == null ? "n/a" : `${Math.round(m.usefulRate * 100)}%`}, ` +
        `acted ${m.actedCount}`,
    );
    process.exit(0);
  };
  void run();
}
