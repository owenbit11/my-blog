export const revalidate = 86400;

import FontSizePicker from '@/components/FontSizePicker'
import Image from 'next/image'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link' // 新增导入
import { getPublishedPostBySlug, getAllPublishedPosts, getSiteLogo } from '@/lib/posts'

type PostPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)

  if (!post) {
    return { title: '文章未找到' }
  }

  return {
    title: post.title,
    description: post.excerpt || `${post.title} 的正文内容`,
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const [post, allPublished, logoUrl] = await Promise.all([
    getPublishedPostBySlug(slug),
    getAllPublishedPosts(),
    getSiteLogo() // 获取 Logo
  ]);

  if (!post) notFound();
  const otherPosts = allPublished.filter(p => p.slug !== slug).slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* 吸顶导航栏 */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center px-4 md:px-8">
        {/* 左侧 Logo */}
        <div className="flex-shrink-0 w-24 md:w-48">
          <Link href="/" className="inline-block transition-transform active:scale-95">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 md:h-10 w-auto object-contain" />
            ) : (
              <div className="bg-black text-white px-3 py-1 font-black text-lg italic">BLOG</div>
            )}
          </Link>
        </div>

        {/* 页面正上方中间的文章标题 */}
        <div className="flex-1 flex justify-center overflow-hidden">
          <h1 className="text-xl font-bold text-gray-900 truncate max-w-[50vw] animate-in fade-in slide-in-from-top-2 duration-500">
            {post.title}
          </h1>
        </div>

        {/* 右侧占位 - 保持标题在物理中心点 */}
        <div className="w-24 md:w-48"></div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12 pt-8">
          {/* 左侧栏：仅保留日期 & 字体控制 */}
          <aside className="lg:w-48 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-10">
              <div className="border-l-2 border-black pl-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Published</span>
                <time className="text-sm font-bold text-gray-900">
                  {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()}
                </time>
              </div>
              <div className="pl-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-3">Reader View</span>
                <FontSizePicker />
              </div>
            </div>
          </aside>

          {/* 中间栏：正文 */}
          <article className="flex-1 min-w-0">
            <div className="prose prose-lg max-w-none w-full !text-left">
              <ReactMarkdown 
                rehypePlugins={[rehypeHighlight]} 
                remarkPlugins={[remarkGfm]}
                components={{
                   // ... 之前的 Image 组件配置保持不变
                }}
              >
                {post.contentMarkdown}
              </ReactMarkdown>
            </div>
          </article>

          {/* 右侧栏：推荐文章列表 */}
          <aside className="lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-10 pt-10 lg:pt-0">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 mb-8 pb-2 border-b-2 border-black inline-block">
              更多文章
            </h3>
            <div className="space-y-10">
              {otherPosts.map((other) => (
                <Link key={other.slug} href={`/posts/${other.slug}`} className="group block">
                  <h4 className="font-bold text-lg leading-snug text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {other.title}
                  </h4>
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2 leading-relaxed">
                    {other.excerpt}
                  </p>
                  <time className="block mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {other.publishedAt ? new Date(other.publishedAt).toLocaleDateString() : ''}
                  </time>
                </Link>
              ))}
            </div>
          </aside>

        </div>
      </main>
    </div>
  )
}