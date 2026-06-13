import robotsParser from "robots-parser";

/**
 * `robots-parser` ships a malformed type declaration: an empty
 * `declare module 'robots-parser';` shadows its real signature, so TypeScript
 * sees the default import as a non-callable namespace. At runtime the module's
 * export is the parser function (`module.exports = robotsParser`), so we pin the
 * signature we actually depend on here.
 */
interface RobotsRules {
  isAllowed(url: string, ua?: string): boolean | undefined;
}
const parseRobots = robotsParser as unknown as (url: string, robotstxt: string) => RobotsRules;

const cache = new Map<string, RobotsRules>();

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
      parser = parseRobots(robotsUrl, body);
      cache.set(robotsUrl, parser);
    } catch {
      return false; // fail closed
    }
  }
  return parser.isAllowed(targetUrl, userAgent) ?? false;
}
