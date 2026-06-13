import nodemailer from "nodemailer";
import { getDb, sourceHealth, unhealthySources, type SourceHealth } from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";

/** Renders a source-health report as readable text. Pure — unit-testable. */
export function formatHealthReport(industryId: string, health: SourceHealth[]): string {
  const bad = unhealthySources(health);
  const lines = health.map((s) => {
    const flag = !s.healthy ? "DOWN" : s.stale ? "STALE" : "ok";
    const age = s.stalenessHours == null ? "never" : `${s.stalenessHours}h ago`;
    const err = s.lastError ? ` — ${s.lastError}` : "";
    return `  [${flag.padEnd(5)}] ${s.id.padEnd(22)} ${s.recordCount} records, last ok ${age}${err}`;
  });
  return (
    `Source health — ${industryId} (${bad.length}/${health.length} need attention)\n` +
    lines.join("\n")
  );
}

/** Sends an alert when sources are failing/stale; SMTP-gated like digest email,
 *  and a no-op-with-notice otherwise. Real paging (PagerDuty/Slack) plugs in the
 *  same way. Returns whether anything needed attention. */
export async function monitorSources(industryId: string): Promise<boolean> {
  getIndustryPack(industryId); // validate id (throws on unknown)
  const db = getDb();
  const staleHours = Number(process.env.SOURCE_STALE_HOURS ?? 192);
  const health = await sourceHealth(db, industryId, staleHours);
  const bad = unhealthySources(health);

  console.log(formatHealthReport(industryId, health));
  if (bad.length === 0) return false;

  const host = process.env.SMTP_HOST;
  const from = process.env.ALERT_FROM ?? process.env.DIGEST_FROM;
  const to = process.env.ALERT_TO ?? process.env.DIGEST_TO;
  if (!host || !from || !to) {
    console.warn(
      `[monitor] ${bad.length} source(s) need attention but alerting is unconfigured ` +
        `(set SMTP_HOST + ALERT_FROM/ALERT_TO). Listed above.`,
    );
    return true;
  }

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  await transport.sendMail({
    from,
    to,
    subject: `[Bellwether] ${bad.length} ${industryId} source(s) need attention`,
    text: formatHealthReport(industryId, health),
  });
  console.log(`[monitor] alerted ${to} about ${bad.length} source(s)`);
  return true;
}

// CLI: `node dist/health.js <industryId>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const industryId = process.argv[2];
  const run = async () => {
    if (!industryId) {
      console.error("Usage: monitor <industryId>");
      process.exitCode = 1;
      return;
    }
    const needsAttention = await monitorSources(industryId);
    process.exit(needsAttention ? 1 : 0); // non-zero exit so cron/CI can page
  };
  void run();
}
