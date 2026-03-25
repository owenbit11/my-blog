import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis'

let limiter: Ratelimit | null = null

export function getAdminLoginLimiter() {
  if (!limiter) {
    const limit = Number(process.env.ADMIN_RATE_LIMIT ?? '10')
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, '1 h'),
      analytics: true,
      prefix: 'ratelimit:admin-login',
    })
  }

  return limiter
}
