import { NextRequest, NextResponse } from 'next/server'
import { getPublishedPostsPaged } from '@/lib/posts'
import { getRedisOrNull } from '@/lib/redis' // 确保这里导入了新函数
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const category = searchParams.get('category') ?? undefined
    const tag = searchParams.get('tag') ?? undefined

    const cacheKey = `posts:paged:${page}:${pageSize}:${category ?? 'all'}:${tag ?? 'all'}`
    const ttl = Number(process.env.CACHE_TTL_SECONDS ?? '60')

    const redis = getRedisOrNull()
    
    // 如果有 Redis，先查缓存
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    // 查数据库
    const result = await getPublishedPostsPaged({ page, pageSize, category, tag })

    // 如果有 Redis，写缓存
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(result), { ex: ttl })
    }

    return NextResponse.json(result)
  } catch (error) {
    logError('获取文章列表失败', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}