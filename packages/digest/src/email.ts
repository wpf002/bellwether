import { digestSections } from "./render.js";
import type { WeeklyDigest } from "./weekly-digest.js";

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

const day = (iso: string) => iso.slice(0, 10);
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Builds the subject + text/HTML bodies for a digest email. Pure — sending lives
 * in the worker. The PDF (with full citations) rides along as an attachment; the
 * body is a scannable summary.
 */
export function digestEmail(digest: WeeklyDigest): DigestEmail {
  const subject = `Bellwether ${digest.industryId} digest — ${day(digest.periodStart)} to ${day(digest.periodEnd)}`;

  const sections = digestSections(digest);
  const text = [
    subject,
    "",
    ...sections.flatMap((s) => [
      `${s.heading} (${s.findings.length})`,
      ...s.findings.map((f) => `  • ${f.claim}`),
      "",
    ]),
    "Full citations in the attached PDF.",
  ].join("\n");

  const html = [
    `<h2>${escape(subject)}</h2>`,
    ...sections.map(
      (s) =>
        `<h3>${escape(s.heading)} (${s.findings.length})</h3><ul>` +
        (s.findings.map((f) => `<li>${escape(f.claim)}</li>`).join("") ||
          "<li><em>none</em></li>") +
        `</ul>`,
    ),
    `<p style="color:#666">Full citations in the attached PDF.</p>`,
  ].join("\n");

  return { subject, text, html };
}
