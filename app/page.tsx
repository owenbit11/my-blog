export const dynamic = 'force-dynamic'
export const metadata = { title: '首页' }

import Link from 'next/link'
import { getPublishedPostsPaged } from '@/lib/posts'
import Pagination from '@/components/Pagination'

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
  const pageSize = 6 // 目标：每页 6 条
  const category = getSingleValue(params.category, '').trim() || undefined
  const tag = getSingleValue(params.tag, '').trim() || undefined

  // 这里现在不会报错了，因为 lib 层已改为接收对象
  const { items, total } = await getPublishedPostsPaged({ page, pageSize, category, tag })

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">我的博客</h1>
      
      {/* 筛选表单 */}
      <form method="get" className="mt-6 grid grid-cols-1 gap-3 rounded border p-4 md:grid-cols-3">
        <input name="category" defaultValue={category} placeholder="分类 (如: tech)" className="rounded border px-3 py-2 text-sm" />
        <input name="tag" defaultValue={tag} placeholder="标签 (如: nextjs)" className="rounded border px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors">筛选</button>
      </form>

      {/* 文章列表 */}
      <div className="mt-10 space-y-6">
        {items.length === 0 ? (
          <p className="py-20 text-center text-gray-400 border rounded-xl border-dashed">暂无相关文章。</p>
        ) : (
          items.map((post) => (
            <article key={post.id} className="group border-b pb-8">
              <h2 className="text-2xl font-bold">
                <Link href={`/posts/${post.slug}`} className="group-hover:text-blue-600 transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-gray-600 leading-relaxed line-clamp-2">{post.excerpt}</p>
              <div className="mt-4 flex items-center gap-4 text-xs font-medium text-gray-400">
                <span className="bg-gray-100 px-2 py-1 rounded text-gray-500">{post.category || '未分类'}</span>
                <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : '未发布'}</span>
              </div>
            </article>
          ))
        )}
      </div>

      {/* 分页导航 */}
      <Pagination total={total} pageSize={pageSize} currentPage={page} />
    </main>
  )
}