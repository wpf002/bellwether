import nodemailer from "nodemailer";
import { sql } from "drizzle-orm";
import { getDb } from "@bellwether/db";
import { getIndustryPack } from "@bellwether/industries";

const WEB_URL = process.env.WEB_PUBLIC_URL ?? "https://bellwether.up.railway.app";

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
  topIndustries: { industryId: string; label: string; count: number }[];
  cronsHealthy: boolean;
}

const labelFor = (id: string): string => {
  try {
    return getIndustryPack(id).label;
  } catch {
    return id;
  }
};

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
    topIndustries: top.map((r) => ({
      industryId: String(r.i),
      label: labelFor(String(r.i)),
      count: num(r.n),
    })),
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
      ? r.topIndustries.map((t) => `  • ${t.label}: +${t.count}`)
      : ["  • (none)"]),
    "",
    `Source health: ${r.sourcesTotal - r.sourcesDown}/${r.sourcesTotal} healthy` +
      (r.sourcesDown ? ` — ${r.sourcesDown} failing` : ""),
    "",
    `View the live dashboard: ${WEB_URL}`,
    `Generated ${r.generatedAt}`,
  ];

  return { subject, text: lines.join("\n"), html: statusHtml(r, heartLine) };
}

// ---- branded HTML email (table-based + inline styles for client compatibility) ----

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function metricCell(label: string, value: number, last = false): string {
  return (
    `<td width="33.33%" valign="top" style="padding:0 ${last ? "0" : "8px"} 0 0;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">` +
    `<tr><td style="padding:13px 14px;">` +
    `<div style="font-size:10px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#94a3b8;">${esc(label)}</div>` +
    `<div style="margin-top:6px;font-family:${MONO};font-size:23px;font-weight:700;color:#0f172a;">${value.toLocaleString()}</div>` +
    `</td></tr></table></td>`
  );
}

function kindChip(label: string, value: number, color: string): string {
  return (
    `<td valign="middle" style="padding-right:20px;white-space:nowrap;">` +
    `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:7px;"></span>` +
    `<span style="font-size:13px;color:#475569;">${esc(label)}</span> ` +
    `<span style="font-family:${MONO};font-size:13px;font-weight:700;color:#0f172a;">${value}</span>` +
    `</td>`
  );
}

function industryRow(label: string, count: number, max: number): string {
  const pct = Math.max(4, Math.round((count / max) * 100));
  return (
    `<tr>` +
    `<td style="padding:5px 12px 5px 0;font-size:13px;color:#0f172a;white-space:nowrap;">${esc(label)}</td>` +
    `<td width="100%" style="padding:5px 0;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#eef2ff;border-radius:999px;">` +
    `<div style="width:${pct}%;height:8px;background:#4f46e5;border-radius:999px;font-size:0;line-height:0;">&nbsp;</div>` +
    `</td></tr></table></td>` +
    `<td align="right" style="padding:5px 0 5px 12px;font-family:${MONO};font-size:12px;font-weight:700;color:#4f46e5;white-space:nowrap;">+${count}</td>` +
    `</tr>`
  );
}

function statusHtml(r: StatusReport, heartLine: string): string {
  const ok = r.cronsHealthy;
  const accent = ok ? "#10b981" : "#ef4444";
  const pillBg = ok ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.20)";
  const healthy = r.sourcesTotal - r.sourcesDown;
  const healthPct = r.sourcesTotal ? Math.round((healthy / r.sourcesTotal) * 100) : 100;
  const maxInd = Math.max(1, ...r.topIndustries.map((t) => t.count));

  const section = (title: string) =>
    `<div style="font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#94a3b8;margin:26px 0 12px;">${title}</div>`;

  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef1f8;">
<div style="display:none;max-height:0;overflow:hidden;color:#eef1f8;">${esc(heartLine)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f8;font-family:${SANS};">
<tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

  <tr><td style="background:#4338ca;background:linear-gradient(135deg,#312e81 0%,#4338ca 55%,#4f46e5 100%);border-radius:16px 16px 0 0;padding:20px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">Bell<span style="color:#fbbf24;">wether</span></td>
      <td valign="middle" align="right"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${pillBg};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Crons ${ok ? "OK" : "Stalled"}</span></td>
    </tr></table>
  </td></tr>

  <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:26px 28px 8px;">
    <div style="font-size:12px;color:#94a3b8;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Daily operations report</div>
    <div style="margin:8px 0 22px;font-size:16px;font-weight:600;color:${accent};">${esc(heartLine)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${metricCell("Total signals", r.signalsTotal)}
      ${metricCell("New · 24h", r.new24h.total)}
      ${metricCell("New · 7d", r.new7d, true)}
    </tr></table>

    ${section("Today's new signals")}
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      ${kindChip("Events", r.new24h.events, "#4f46e5")}
      ${kindChip("Companies", r.new24h.companies, "#0ea5e9")}
      ${kindChip("Complaints", r.new24h.complaints, "#ef4444")}
    </tr></table>

    ${section("Most active industries · 24h")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${
        r.topIndustries.length
          ? r.topIndustries.map((t) => industryRow(t.label, t.count, maxInd)).join("")
          : `<tr><td style="font-size:13px;color:#94a3b8;">No new signals yet.</td></tr>`
      }
    </table>

    ${section("Source health")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="100%" style="padding-right:12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#fee2e2;border-radius:999px;">
        <div style="width:${healthPct}%;height:8px;background:#10b981;border-radius:999px;font-size:0;line-height:0;">&nbsp;</div>
      </td></tr></table></td>
      <td align="right" style="font-size:12px;color:#475569;white-space:nowrap;"><b>${healthy}/${r.sourcesTotal}</b> healthy${r.sourcesDown ? ` · <span style="color:#ef4444;">${r.sourcesDown} failing</span>` : ""}</td>
    </tr></table>

    <div style="margin:28px 0 8px;text-align:center;">
      <a href="${WEB_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:10px;">Open the dashboard &rarr;</a>
    </div>
  </td></tr>

  <tr><td style="padding:16px 28px;text-align:center;">
    <div style="font-size:11px;color:#94a3b8;">Every figure traces to a cited source · generated ${esc(r.generatedAt)}</div>
  </td></tr>

</table></td></tr></table></body></html>`;
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
