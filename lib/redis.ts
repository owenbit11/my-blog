import { Redis } from '@upstash/redis'

let redisSingleton: Redis | null = null

export function getRedis(): Redis {
  if (!redisSingleton) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN')
    }

    redisSingleton = new Redis({ url, token })
  }

  return redisSingleton
}
