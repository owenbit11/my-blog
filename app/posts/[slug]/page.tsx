export const revalidate = 86400; // 每 24 小时刷新一次文章缓存

import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getPublishedPostBySlug } from '@/lib/posts' // 修正：使用 Slug 查询

type PostPageProps = {
  params: Promise<{ slug: string }> // 修正：Next.js 16 规范，且对应文件夹名 [slug]
}

// 新增：动态生成元数据函数
export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)

  if (!post) {
    return {
      title: '文章未找到',
    }
  }

  return {
    title: post.title, // 自动填充到 layout.tsx 的 %s 中
    description: post.excerpt || `${post.title} 的正文内容`,
  }
}

export default async function PostPage({ params }: PostPageProps) {
  // 核心修复：必须 await params
  const { slug } = await params
  
  // 使用 slug 获取文章
  const post = await getPublishedPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex gap-4 text-gray-500 text-sm">
          {post.publishedAt && (
            <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
          )}
          {post.category && <span>{post.category}</span>}
        </div>
      </header>

      <div className="prose prose-lg max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.contentMarkdown}
        </ReactMarkdown>
      </div>

      {post.tags.length > 0 && (
        <div className="mt-12 pt-6 border-t flex gap-2">
          {post.tags.map(tag => (
            <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
