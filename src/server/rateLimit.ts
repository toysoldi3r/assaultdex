// Minimal fixed-window rate limiter (Phase 10). In-memory only — suitable for a
// single instance. For multi-instance production, back this with Redis (spec:
// "Redis only when needed"); the interface stays the same.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Window {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  check(key: string): RateLimitResult {
    const t = this.now();
    const existing = this.windows.get(key);

    if (!existing || t >= existing.resetAt) {
      const resetAt = t + this.windowMs;
      this.windows.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: this.limit - 1, resetAt };
    }

    if (existing.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: this.limit - existing.count,
      resetAt: existing.resetAt,
    };
  }

  /** Drop expired windows to bound memory. */
  sweep(): void {
    const t = this.now();
    for (const [key, w] of this.windows) {
      if (t >= w.resetAt) this.windows.delete(key);
    }
  }
}

// Shared limiter for write-ish actions (import/generate). Process-local.
const globalForLimiter = globalThis as unknown as {
  assaultdexLimiter?: RateLimiter;
};

export const writeLimiter =
  globalForLimiter.assaultdexLimiter ??
  (globalForLimiter.assaultdexLimiter = new RateLimiter(20, 60_000));
