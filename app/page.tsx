export const dynamic = 'force-dynamic'
export const metadata = {
  title: '首页',
}

import Link from 'next/link'
import { getPublishedPostsPaged } from '@/lib/posts'



export const revalidate = 3600

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getSingleValue(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback
  return value ?? fallback
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams

  const page = Number(getSingleValue(params.page, '1')) || 1
  const pageSize = Number(getSingleValue(params.pageSize, '10')) || 10
  const category = getSingleValue(params.category, '').trim() || undefined
  const tag = getSingleValue(params.tag, '').trim() || undefined

  const { items, total } = await getPublishedPostsPaged({ page, pageSize, category, tag })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const prev = Math.max(1, page - 1)
  const next = Math.min(totalPages, page + 1)

  const queryBase = new URLSearchParams()
  queryBase.set('pageSize', String(pageSize))
  if (category) queryBase.set('category', category)
  if (tag) queryBase.set('tag', tag)

  const prevQs = new URLSearchParams(queryBase)
  prevQs.set('page', String(prev))
  const nextQs = new URLSearchParams(queryBase)
  nextQs.set('page', String(next))

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">我的博客</h1>
      <p className="mt-2 text-sm opacity-70">文章支持分页 + 分类 + 标签筛选。</p>

      <form method="get" className="mt-6 grid grid-cols-1 gap-3 rounded border p-4 md:grid-cols-4">
        <input name="category" defaultValue={category} placeholder="category: tech" className="rounded border px-3 py-2" />
        <input name="tag" defaultValue={tag} placeholder="tag: nextjs" className="rounded border px-3 py-2" />
        <input name="pageSize" defaultValue={String(pageSize)} className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">筛选</button>
      </form>

      <div className="mt-8 space-y-4">
        {items.length === 0 ? (
          <p className="rounded-md border p-4">暂无已发布文章。</p>
        ) : (
          items.map((post) => (
            <article key={post.id} className="rounded-md border p-4">
              <h2 className="text-xl font-semibold">
                <Link href={`/posts/${post.slug}`} className="underline">{post.title}</Link>
              </h2>
              <p className="mt-2 text-sm opacity-80">{post.excerpt}</p>
              <p className="mt-1 text-xs opacity-60">
                分类：{post.category ?? '-'} | 标签：{post.tags.join(', ') || '-'}
              </p>
              {post.publishedAt ? (
                <p className="mt-1 text-xs opacity-60">
                  发布时间：{new Date(post.publishedAt).toLocaleString('zh-CN')}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm opacity-70">第 {page}/{totalPages} 页，共 {total} 篇</span>
        <div className="flex gap-2">
          <Link
            href={`/?${prevQs.toString()}`}
            className={`rounded border px-3 py-2 text-sm ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
          >
            上一页
          </Link>
          <Link
            href={`/?${nextQs.toString()}`}
            className={`rounded border px-3 py-2 text-sm ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
          >
            下一页
          </Link>
        </div>
      </div>
    </main>
  )
}
