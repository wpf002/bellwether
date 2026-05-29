import robotsParser from "robots-parser";

const cache = new Map<string, ReturnType<typeof robotsParser>>();

/**
 * Fetches and caches a host's robots.txt, then answers whether a path is
 * allowed for our user agent. Defaults to DENY on fetch failure when
 * SCRAPER_RESPECT_ROBOTS is true — fail closed, not open.
 */
export async function isAllowed(targetUrl: string, userAgent: string): Promise<boolean> {
  const respect = (process.env.SCRAPER_RESPECT_ROBOTS ?? "true") === "true";
  if (!respect) return true;

  const u = new URL(targetUrl);
  const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;

  let parser = cache.get(robotsUrl);
  if (!parser) {
    try {
      const res = await fetch(robotsUrl, { headers: { "user-agent": userAgent } });
      const body = res.ok ? await res.text() : "";
      parser = robotsParser(robotsUrl, body);
      cache.set(robotsUrl, parser);
    } catch {
      return false; // fail closed
    }
  }
  return parser.isAllowed(targetUrl, userAgent) ?? false;
}
