import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Applied to register/login/forgot-password — see docs/ARCHITECTURE.md's
// tech stack table for why Upstash (Vercel functions are stateless).
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '5 m'),
      analytics: true,
    })
  : null;

export async function checkRateLimit(key: string): Promise<{ ok: true } | { ok: false }> {
  if (!limiter) return { ok: true }; // no Upstash configured (e.g. local dev) — don't block
  const { success } = await limiter.limit(key);
  return success ? { ok: true } : { ok: false };
}
