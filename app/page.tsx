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
      <div className="mt-10 space-y-8"> {/* 增加卡片间的间距 */}
        {items.length === 0 ? (
          <p className="py-20 text-center text-gray-400 border rounded-xl border-dashed">暂无相关文章。</p>
        ) : (
          items.map((post) => (
            // --- 修改点 1: 文章外框改为黑色边框卡片样式 ---
            <article key={post.id} className="group border p-6 rounded-lg bg-gray-50 shadow-sm transition-all hover:shadow-md">
              <h2 className="text-2xl font-bold">
                <Link href={`/posts/${post.slug}`} className="group-hover:text-blue-600 transition-colors">
                  {post.title}
                </Link>
              </h2>
              
              {/* --- 修改点 2: Excerpt 改为灰色内嵌框样式 --- */}
              <div className="mt-4 border border-gray-200 p-4 rounded bg-white text-gray-600 leading-relaxed text-sm line-clamp-3">
              {post.excerpt && post.excerpt.length > 89 
                  ? `${post.excerpt.slice(0, 89)}...` 
                  : (post.excerpt || "暂无摘要...")}
              </div>

              {/* 底部元数据 */}
              <div className="mt-6 flex items-center justify-between text-xs font-medium text-gray-400 border-t pt-4">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase tracking-wider">
                    {post.category || '未分类'}
                  </span>
                  {post.tags && post.tags.length > 0 && (
                    <span className="hidden sm:inline">
                      标签: {post.tags.join(', ')}
                    </span>
                  )}
                </div>
                <time className="font-mono">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : '未发布'}
                </time>
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