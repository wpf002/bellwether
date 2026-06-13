import PDFDocument from "pdfkit";
import type { KpiValue } from "@bellwether/core";
import type { Finding, WeeklyDigest } from "./weekly-digest.js";

export interface RenderSection {
  heading: string;
  findings: Finding[];
}

/** Formats a KPI value (scalar, distribution, or null) for display. */
export function formatKpiValue(value: KpiValue): string {
  if (value == null) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value;
  const entries = Object.entries(value);
  if (entries.length === 0) return "—";
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n < 1 ? `${Math.round(n * 100)}%` : n}`)
    .join(", ");
}

/**
 * The digest's three sections in render order. Pure — separated from PDF layout
 * so the structure is unit-testable without generating a document.
 */
export function digestSections(digest: WeeklyDigest): RenderSection[] {
  return [
    { heading: "Key players", findings: digest.keyPlayers },
    { heading: "What changed", findings: digest.whatChanged },
    { heading: "Buyer sentiment", findings: digest.buyerComplaints },
  ];
}

export interface RenderOptions {
  /** Maps a raw-record id to its source URL, so citations link to the source. */
  sourceUrls?: Record<string, string>;
  title?: string;
}

/**
 * Renders a weekly digest to a PDF buffer. Every finding prints its claim
 * followed by its citations — the source URLs (clickable) behind the claim — so
 * the provenance invariant survives all the way to the deliverable. No claim is
 * rendered without the records that back it.
 */
export function renderDigestPdf(
  digest: WeeklyDigest,
  options: RenderOptions = {},
): Promise<Buffer> {
  const urls = options.sourceUrls ?? {};
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(options.title ?? `Market digest — ${digest.industryId}`);
    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor("#666")
      .text(`Period: ${digest.periodStart} → ${digest.periodEnd}`)
      .text(`Generated: ${digest.generatedAt}`)
      .fillColor("#000");

    if (digest.kpis?.length) {
      doc.moveDown(1).fontSize(14).text("Key metrics");
      doc.moveDown(0.3).fontSize(10);
      for (const kpi of digest.kpis) {
        doc.text(`• ${kpi.label}: ${formatKpiValue(kpi.value)}`);
      }
    }

    for (const section of digestSections(digest)) {
      doc.moveDown(1).fontSize(14).text(`${section.heading} (${section.findings.length})`);
      doc.moveDown(0.3).fontSize(10);
      if (section.findings.length === 0) {
        doc.fillColor("#999").text("— none this period —").fillColor("#000");
        continue;
      }
      for (const finding of section.findings) {
        doc.text(`• ${finding.claim}`);
        for (const recordId of finding.sourceRecordIds) {
          const url = urls[recordId];
          doc.fontSize(8).fillColor("#1a56db");
          if (url) {
            doc.text(`    source: ${url}`, { link: url, underline: true });
          } else {
            doc.text(`    source record: ${recordId}`);
          }
          doc.fillColor("#000").fontSize(10);
        }
        doc.moveDown(0.4);
      }
    }

    doc.end();
  });
}
