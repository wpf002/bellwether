/**
 * Per-key sliding-window rate limiter (in-memory). Pure clock injection makes it
 * testable. In-memory is fine for a single instance; a multi-instance deploy
 * would back this with Redis (same interface).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private now: () => number = () => Date.now()) {}

  /** Records a hit and reports whether it's within `perMinute`. */
  check(key: string, perMinute: number): { allowed: boolean; remaining: number } {
    if (!Number.isFinite(perMinute)) return { allowed: true, remaining: Number.POSITIVE_INFINITY };
    const t = this.now();
    const windowStart = t - 60_000;
    const recent = (this.hits.get(key) ?? []).filter((ts) => ts > windowStart);
    if (recent.length >= perMinute) {
      this.hits.set(key, recent);
      return { allowed: false, remaining: 0 };
    }
    recent.push(t);
    this.hits.set(key, recent);
    return { allowed: true, remaining: perMinute - recent.length };
  }
}
