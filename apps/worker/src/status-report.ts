import nodemailer from "nodemailer";
import { sql } from "drizzle-orm";
import { getDb } from "@bellwether/db";

/**
 * Daily operations email: is Bellwether healthy and is the corpus growing?
 *
 * Answers the two questions you actually care about day to day:
 *   1. Are the cron jobs running? (did new raw records arrive in the last 24h)
 *   2. Is the signal corpus progressing? (new signals by kind, top industries)
 * Plus source health. Pure-ish: builds a report from the DB, then emails it via
 * SMTP. Like the digest mailer, it no-ops with a log line if SMTP isn't set.
 */

export interface StatusReport {
  generatedAt: string;
  signalsTotal: number;
  new24h: { events: number; companies: number; complaints: number; total: number };
  new7d: number;
  raw24h: number;
  sourcesActive24h: number;
  sourcesTotal: number;
  sourcesDown: number;
  topIndustries: { industryId: string; count: number }[];
  cronsHealthy: boolean;
}

const num = (v: unknown): number => Number(v ?? 0);

export async function buildStatusReport(): Promise<StatusReport> {
  const db = getDb();
  const rows = async (q: ReturnType<typeof sql>) => {
    const r = await db.execute(q);
    return (r as unknown as { rows?: Record<string, unknown>[] }).rows ?? (r as unknown[]);
  };

  const [tot] = (await rows(sql`select count(*) n from signals`)) as Record<string, unknown>[];
  const kinds = (await rows(sql`
    select entity_kind k,
      count(*) n,
      count(*) filter (where entity_kind = 'sentiment_theme' and payload->>'polarity' = 'negative') neg
    from signals where created_at > now() - interval '24 hours' group by 1
  `)) as Record<string, unknown>[];
  const byKind = Object.fromEntries(kinds.map((r) => [String(r.k), num(r.n)]));
  const complaints = kinds.reduce((a, r) => a + num(r.neg), 0);

  const [sevenD] = (await rows(
    sql`select count(*) n from signals where created_at > now() - interval '7 days'`,
  )) as Record<string, unknown>[];
  const [raw] = (await rows(
    sql`select count(*) n from raw_records where fetched_at > now() - interval '24 hours'`,
  )) as Record<string, unknown>[];
  const [srcAct] = (await rows(sql`
    select count(distinct source_id) n from raw_records where fetched_at > now() - interval '24 hours'
  `)) as Record<string, unknown>[];
  const [srcTot] = (await rows(sql`select count(*) n from sources`)) as Record<string, unknown>[];
  const [srcDown] = (await rows(sql`select count(*) n from sources where healthy = 0`)) as Record<
    string,
    unknown
  >[];
  const top = (await rows(sql`
    select industry_id i, count(*) n from signals
    where created_at > now() - interval '24 hours' group by 1 order by n desc limit 6
  `)) as Record<string, unknown>[];

  const new24h = {
    events: byKind.market_event ?? 0,
    companies: byKind.company ?? 0,
    complaints,
    total: Object.values(byKind).reduce((a, b) => a + b, 0),
  };

  return {
    generatedAt: new Date().toISOString(),
    signalsTotal: num(tot?.n),
    new24h,
    new7d: num(sevenD?.n),
    raw24h: num(raw?.n),
    sourcesActive24h: num(srcAct?.n),
    sourcesTotal: num(srcTot?.n),
    sourcesDown: num(srcDown?.n),
    topIndustries: top.map((r) => ({ industryId: String(r.i), count: num(r.n) })),
    cronsHealthy: num(raw?.n) > 0,
  };
}

export interface StatusEmail {
  subject: string;
  text: string;
  html: string;
}

export function statusEmail(r: StatusReport): StatusEmail {
  const heart = r.cronsHealthy ? "OK" : "STALLED";
  const subject = `Bellwether daily — +${r.new24h.total} signals (24h) · crons ${heart}`;

  const heartLine = r.cronsHealthy
    ? `Crons OK — ${r.raw24h} new raw records from ${r.sourcesActive24h} sources in the last 24h.`
    : `WARNING: no new raw records in 24h — the scrape crons may not be running.`;

  const lines = [
    subject,
    "",
    heartLine,
    "",
    "Signal progression:",
    `  Total signals: ${r.signalsTotal}`,
    `  New (24h): ${r.new24h.total}  (events ${r.new24h.events}, companies ${r.new24h.companies}, complaints ${r.new24h.complaints})`,
    `  New (7d):  ${r.new7d}`,
    "",
    "Most active industries (24h):",
    ...(r.topIndustries.length
      ? r.topIndustries.map((t) => `  • ${t.industryId}: +${t.count}`)
      : ["  • (none)"]),
    "",
    `Source health: ${r.sourcesTotal - r.sourcesDown}/${r.sourcesTotal} healthy` +
      (r.sourcesDown ? ` — ${r.sourcesDown} failing` : ""),
    "",
    `Generated ${r.generatedAt}`,
  ];

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const color = r.cronsHealthy ? "#10b981" : "#ef4444";
  const html = [
    `<h2 style="margin:0 0 4px">Bellwether daily</h2>`,
    `<p style="font-weight:600;color:${color};margin:0 0 16px">${esc(heartLine)}</p>`,
    `<h3 style="margin:0 0 4px">Signal progression</h3>`,
    `<ul style="margin:0 0 16px">`,
    `<li>Total signals: <b>${r.signalsTotal}</b></li>`,
    `<li>New (24h): <b>${r.new24h.total}</b> — events ${r.new24h.events}, companies ${r.new24h.companies}, complaints ${r.new24h.complaints}</li>`,
    `<li>New (7d): <b>${r.new7d}</b></li>`,
    `</ul>`,
    `<h3 style="margin:0 0 4px">Most active industries (24h)</h3>`,
    `<ul style="margin:0 0 16px">` +
      (r.topIndustries.map((t) => `<li>${esc(t.industryId)}: +${t.count}</li>`).join("") ||
        "<li><em>none</em></li>") +
      `</ul>`,
    `<p style="color:#666">Source health: ${r.sourcesTotal - r.sourcesDown}/${r.sourcesTotal} healthy` +
      (r.sourcesDown ? ` — ${r.sourcesDown} failing` : "") +
      `</p>`,
    `<p style="color:#999;font-size:12px">Generated ${esc(r.generatedAt)}</p>`,
  ].join("\n");

  return { subject, text: lines.join("\n"), html };
}

/** Build + email the daily status report. No-op (logs) if SMTP isn't configured. */
export async function sendStatusReport(): Promise<"sent" | "skipped"> {
  const report = await buildStatusReport();
  const mail = statusEmail(report);

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.STATUS_FROM ?? process.env.ALERT_FROM ?? process.env.DIGEST_FROM;
  const to = process.env.STATUS_TO ?? process.env.ALERT_TO ?? process.env.DIGEST_TO;

  if (!host || !from || !to) {
    console.log(
      `[status] SMTP not configured (need SMTP_HOST, STATUS_FROM/ALERT_FROM, STATUS_TO/ALERT_TO) — ` +
        `skipping send. Report: ${mail.subject}`,
    );
    return "skipped";
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transport.sendMail({ from, to, subject: mail.subject, text: mail.text, html: mail.html });
  console.log(`[status] sent "${mail.subject}" to ${to}`);
  return "sent";
}

// CLI: `node dist/status-report.js` — build + send once (prints the report).
if (import.meta.url === `file://${process.argv[1]}`) {
  const run = async () => {
    const report = await buildStatusReport();
    console.log(JSON.stringify(report, null, 2));
    const result = await sendStatusReport();
    console.log(`[status] ${result}`);
    process.exit(0);
  };
  void run();
}
