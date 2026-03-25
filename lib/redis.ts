import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null

export function getRedis() {
  if (!redisInstance) {
    // 确保环境变量存在
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('Redis 环境变量未配置')
    }

    redisInstance = new Redis({
      url: url,
      token: token,
    })
  }
  return redisInstance
}

// 核心修复：提供这个函数，防止环境变量缺失时程序直接崩溃
export function getRedisOrNull(): Redis | null {
  try {
    return getRedis()
  } catch (e) {
    return null
  }
}