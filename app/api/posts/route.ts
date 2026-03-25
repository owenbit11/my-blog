export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getPublishedPostsPaged } from '@/lib/posts'
import { getRedis } from '@/lib/redis'
import { logError } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Number(searchParams.get('page') ?? '1')
    const pageSize = Number(searchParams.get('pageSize') ?? '10')
    const category = searchParams.get('category')?.trim() || ''
    const tag = searchParams.get('tag')?.trim() || ''

    const key = `cache:posts:page=${page}:size=${pageSize}:c=${category}:t=${tag}`
    const ttl = Number(process.env.CACHE_TTL_SECONDS ?? '60')

    const redis = getRedisOrNull()

if (redis) {
  const cached = await redis.get(key)
  if (cached) return NextResponse.json(cached)
}

// ...正常查库

if (redis) {
  await redis.set(key, data, { ex: ttl })
}

    if (cached) {
      return NextResponse.json(cached)
    }

    const data = await getPublishedPostsPaged({
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 10,
      category: category || undefined,
      tag: tag || undefined,
    })

    await redis.set(key, data, { ex: ttl })
    return NextResponse.json(data)
  } catch (error) {
    logError('GET /api/posts failed', error)
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
  }
}
