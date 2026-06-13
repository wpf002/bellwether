import PDFDocument from "pdfkit";
import type { Finding, WeeklyDigest } from "./weekly-digest.js";

export interface RenderSection {
  heading: string;
  findings: Finding[];
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
