/**
 * Minimal in-process token bucket rate limiter (PLAN.md §8.4, §8.1, DECISIONS.md).
 * One bucket per key (socket id for socket events, IP for the POST /games HTTP route).
 */
export class TokenBucket {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {}

  /** Returns true if a token was available and consumed, false if the caller is rate-limited. */
  consume(key: string, cost = 1): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: now };

    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillPerSecond);
    bucket.lastRefill = now;

    if (bucket.tokens < cost) {
      this.buckets.set(key, bucket);
      return false;
    }
    bucket.tokens -= cost;
    this.buckets.set(key, bucket);
    return true;
  }

  /** Removes a key's bucket (e.g. on socket disconnect) to bound memory growth. */
  delete(key: string): void {
    this.buckets.delete(key);
  }
}

// PLAN.md §8.4: 20 events/s, burst 40, per socket.
export const socketEventLimiter = new TokenBucket(40, 20);

// PLAN.md §8.1: 10 requests per minute per IP on POST /games.
export const createGameLimiter = new TokenBucket(10, 10 / 60);
