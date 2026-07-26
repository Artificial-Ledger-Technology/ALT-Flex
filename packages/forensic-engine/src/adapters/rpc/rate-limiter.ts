/**
 * @module rate-limiter
 * @description Token-bucket rate limiter for per-chain RPC throttling.
 *
 * Pure TypeScript — no external dependencies. Configurable max requests
 * per second per chain. `acquire()` blocks until a token is available.
 *
 * @hexagonal Infrastructure — Adapter Layer
 * @task P5-EVM-001
 */

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxPerSecond: number) {
    this.tokens = maxPerSecond;
    this.lastRefill = Date.now();
  }

  /** Wait until a rate-limit token is available. */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens -= 1;
      return;
    }

    // Queue the request and wait for a token
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      setTimeout(() => this.drainQueue(), 1000 / this.maxPerSecond);
    });
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = (elapsed / 1000) * this.maxPerSecond;

    if (newTokens >= 1) {
      this.tokens = Math.min(this.maxPerSecond, this.tokens + Math.floor(newTokens));
      this.lastRefill = now;
    }
  }

  private drainQueue(): void {
    this.refill();
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens -= 1;
      const resolve = this.queue.shift();
      resolve?.();
    }
  }
}
