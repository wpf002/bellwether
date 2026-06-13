import nodemailer from "nodemailer";
import { renderDigestPdf, digestEmail } from "@bellwether/digest";
import { loadLatestDigest } from "./render.js";

/**
 * Emails the latest digest as a cited-PDF attachment with a scannable summary
 * body. SMTP is configured via env (SMTP_HOST/PORT/USER/PASS, DIGEST_FROM,
 * DIGEST_TO). If SMTP isn't configured, this is a no-op that says so rather than
 * failing — the render path still produces the PDF.
 */
export async function deliverLatestDigest(industryId: string): Promise<"sent" | "skipped"> {
  const { host, port, user, pass, from, to } = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.DIGEST_FROM,
    to: process.env.DIGEST_TO,
  };

  const { digest, sourceUrls } = await loadLatestDigest(industryId);
  const pdf = await renderDigestPdf(digest, { sourceUrls });
  const mail = digestEmail(digest);

  if (!host || !from || !to) {
    console.log(
      `[deliver] SMTP not configured (need SMTP_HOST, DIGEST_FROM, DIGEST_TO) — skipping send. ` +
        `Digest "${mail.subject}" rendered (${pdf.length} bytes).`,
    );
    return "skipped";
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transport.sendMail({
    from,
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments: [{ filename: `digest-${industryId}.pdf`, content: pdf }],
  });
  console.log(`[deliver] sent "${mail.subject}" to ${to}`);
  return "sent";
}

// CLI: `node dist/deliver.js <industryId>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const industryId = process.argv[2];
  const run = async () => {
    if (!industryId) {
      console.error("Usage: deliver <industryId>");
      process.exitCode = 1;
      return;
    }
    await deliverLatestDigest(industryId);
    process.exit(0);
  };
  void run();
}
