/**
 * Simple in-memory sliding-window rate limiter.
 * Works per-process — fine for Vercel (each lambda is isolated).
 * Upgrade to Upstash KV for multi-instance / persistent limits.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/** Clean up expired windows every 5 minutes to avoid memory leaks. */
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (now > win.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** Unix ms when the window resets */
  resetAt: number;
}

/**
 * Check (and increment) a rate-limit counter.
 *
 * @param key        Unique identifier — e.g. `"sales:" + userEmail`
 * @param limit      Max requests allowed per window
 * @param windowMs   Window length in milliseconds (default: 60 000 = 1 min)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  let win = store.get(key);

  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }

  win.count++;

  return {
    success: win.count <= limit,
    remaining: Math.max(0, limit - win.count),
    resetAt: win.resetAt,
  };
}

/**
 * Build the standard rate-limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult, limit: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.success ? {} : { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) }),
  };
}
