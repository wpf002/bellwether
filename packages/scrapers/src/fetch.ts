/**
 * Resilient fetch for adapters: retries transient failures (network errors,
 * 429, 5xx) with exponential backoff; treats other 4xx as terminal. This is
 * resilience, NOT evasion — it never retries past a bot-detection/CAPTCHA wall
 * (a 403 is terminal) and changes nothing about identity or robots handling
 * (see COMPLIANCE.md).
 */

export class ScrapeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ScrapeError";
  }
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests. Defaults to a real timer. */
  sleepImpl?: (ms: number) => Promise<void>;
}

const isRetryableStatus = (status: number) => status === 429 || (status >= 500 && status <= 599);

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetches a URL's text body with bounded retries. Throws a ScrapeError on a
 * terminal failure or once retries are exhausted.
 */
export async function fetchTextWithRetry(
  url: string,
  init: RequestInit,
  cfg: RetryConfig = {},
): Promise<string> {
  const maxRetries = cfg.maxRetries ?? 3;
  const baseDelayMs = cfg.baseDelayMs ?? 500;
  const doFetch = cfg.fetchImpl ?? fetch;
  const sleep = cfg.sleepImpl ?? defaultSleep;

  let lastErr: ScrapeError | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await doFetch(url, init);
      if (res.ok) return await res.text();
      const retryable = isRetryableStatus(res.status);
      lastErr = new ScrapeError(`fetch failed ${res.status} for ${url}`, res.status, retryable);
      if (!retryable) throw lastErr; // terminal 4xx (incl. 403 bot-wall) — do not hammer
    } catch (err) {
      // Network/DNS errors are retryable; a terminal ScrapeError is rethrown as-is.
      if (err instanceof ScrapeError && !err.retryable) throw err;
      lastErr =
        err instanceof ScrapeError
          ? err
          : new ScrapeError(err instanceof Error ? err.message : String(err), undefined, true);
    }
    if (attempt < maxRetries) {
      // Exponential backoff with jitter.
      const delay = baseDelayMs * 2 ** attempt * (1 + Math.random() * 0.25);
      await sleep(delay);
    }
  }
  throw lastErr ?? new ScrapeError(`fetch failed for ${url}`);
}
