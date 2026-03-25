export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { getAdminLoginLimiter } from '@/lib/rate-limit'
import { getRedis } from '@/lib/redis'
import { logError, logInfo } from '@/lib/logger'
import { verifyAdminPassword } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createPost, getAllPostsForAdmin, updatePostById, deletePostById } from '@/lib/posts'
import { clearAdminSession, isAdminLoggedIn, setAdminSession } from '@/lib/auth'

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeTags(raw: string): string | null {
  const value = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',')

  return value || null
}

async function loginAction(formData: FormData) {
  'use server'

  const password = String(formData.get('password') ?? '')

  // 取客户端 IP（Vercel 场景常见）
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // 限流检查
  

  const limiter = getAdminLoginLimiter()
try {
  const result = await limiter.limit(ip)
  if (!result.success) {
    redirect('/admin?error=rate_limited')
  }
} catch {
  // 降级：限流失败不阻断登录流程（避免本地 fetch failed）
}
const result = await limiter.limit(ip)

  if (!result.success) {
    redirect('/admin?error=rate_limited')
  }

  // 你原有的密码校验逻辑（明文或 bcrypt）保持不变
  if (!(await verifyAdminPassword(password))) {
    redirect('/admin?error=bad_password')
  }

  await setAdminSession()
  redirect('/admin')
}



async function logoutAction() {
  'use server'

  await clearAdminSession()
  redirect('/admin')
}

async function createPostAction(formData: FormData) {
  'use server'

  const loggedIn = await isAdminLoggedIn()
  if (!loggedIn) {
    redirect('/admin')
  }

  const title = String(formData.get('title') ?? '').trim()
  const excerpt = String(formData.get('excerpt') ?? '').trim()
  const contentMarkdown = String(formData.get('contentMarkdown') ?? '').trim()
  const status = String(formData.get('status') ?? 'draft') === 'published' ? 'published' : 'draft'
  const rawSlug = String(formData.get('slug') ?? '').trim()
  const slug = toSlug(rawSlug || title) || `post-${Date.now()}`

  const category = String(formData.get('category') ?? '').trim() || null
  const tags = normalizeTags(String(formData.get('tags') ?? ''))

  if (!title || !contentMarkdown || !slug) {
    redirect('/admin?error=invalid_form')
  }

  await createPost({
    title,
    excerpt,
    contentMarkdown,
    slug,
    status,
    category,
    tags,
  })

  revalidatePath('/')
  revalidatePath('/api/posts')
  revalidatePath(`/posts/${slug}`)
  redirect('/admin?success=created')
}

async function updatePostAction(formData: FormData) {
  'use server'

  const loggedIn = await isAdminLoggedIn()
  if (!loggedIn) {
    redirect('/admin')
  }

  const id = Number(String(formData.get('id') ?? '0'))
  const title = String(formData.get('title') ?? '').trim()
  const excerpt = String(formData.get('excerpt') ?? '').trim()
  const contentMarkdown = String(formData.get('contentMarkdown') ?? '').trim()
  const status = String(formData.get('status') ?? 'draft') === 'published' ? 'published' : 'draft'
  const rawSlug = String(formData.get('slug') ?? '').trim()
  const slug = toSlug(rawSlug || title) || `post-${Date.now()}`

  const category = String(formData.get('category') ?? '').trim() || null
  const tags = normalizeTags(String(formData.get('tags') ?? ''))

  if (!id || !title || !contentMarkdown || !slug) {
    redirect('/admin?error=invalid_form')
  }

  await updatePostById({
    id,
    title,
    slug,
    excerpt,
    contentMarkdown,
    status,
    category,
    tags,
  })

  revalidatePath('/')
  revalidatePath('/api/posts')
  revalidatePath(`/posts/${slug}`)
  redirect('/admin?success=updated')
}

async function deletePostAction(formData: FormData) {
  'use server'

  const loggedIn = await isAdminLoggedIn()
  if (!loggedIn) {
    redirect('/admin')
  }

  const id = Number(String(formData.get('id') ?? '0'))
  if (!id) {
    redirect('/admin?error=invalid_form')
  }

  await deletePostById(id)

  revalidatePath('/')
  revalidatePath('/api/posts')
  redirect('/admin?success=deleted')
}

const redis = getRedis()
await redis.del('cache:posts:*')


type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const loggedIn = await isAdminLoggedIn()
  const params = await searchParams
  const posts = await getAllPostsForAdmin()

  if (!loggedIn) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-10">
        <h1 className="text-2xl font-bold">Admin 登录</h1>
        <p className="mt-2 text-sm opacity-70">输入 ADMIN_PASSWORD 登录后台。</p>

        {params.error === 'bad_password' ? (
          <p className="mt-4 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-700">
            密码错误，请重试。
          </p>
        ) : null}
        {params.error === 'rate_limited' ? (
  <p className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-700">
    登录尝试过多，请稍后再试。
  </p>
) : null}


        <form action={loginAction} className="mt-6 space-y-4 rounded-md border p-4">
          <label className="block text-sm font-medium">密码</label>
          <input
            name="password"
            type="password"
            className="w-full rounded border px-3 py-2"
            placeholder="请输入管理员密码"
            required
          />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            登录
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">后台发布文章</h1>
        <form action={logoutAction}>
          <button type="submit" className="rounded border px-3 py-2 text-sm">
            退出登录
          </button>
        </form>
      </div>

      {params.success === 'created' ? (
        <p className="mt-4 rounded-md border border-green-400 bg-green-50 p-3 text-sm text-green-700">
          发布成功！
        </p>
      ) : null}

      {params.success === 'updated' ? (
        <p className="mt-4 rounded-md border border-blue-400 bg-blue-50 p-3 text-sm text-blue-700">
          修改成功！
        </p>
      ) : null}

      {params.success === 'deleted' ? (
        <p className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-700">
          删除成功！
        </p>
      ) : null}

      {params.error === 'invalid_form' ? (
        <p className="mt-4 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-700">
          表单不完整，请检查标题、slug 和内容。
        </p>
      ) : null}

      <form action={createPostAction} className="mt-6 space-y-4 rounded-md border p-4">
        <h2 className="text-lg font-semibold">新建文章</h2>

        <div>
          <label className="mb-1 block text-sm font-medium">标题</label>
          <input name="title" className="w-full rounded border px-3 py-2" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Slug（可不填，自动由标题生成）</label>
          <input name="slug" className="w-full rounded border px-3 py-2" placeholder="hello-tidb" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">摘要</label>
          <textarea name="excerpt" rows={2} className="w-full rounded border px-3 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">分类（category）</label>
          <input name="category" className="w-full rounded border px-3 py-2" placeholder="例如：tech" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">标签（tags，英文逗号分隔）</label>
          <input name="tags" className="w-full rounded border px-3 py-2" placeholder="例如：nextjs,tidb,markdown" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Markdown 内容</label>
          <textarea
            name="contentMarkdown"
            rows={8}
            className="w-full rounded border px-3 py-2 font-mono text-sm"
            placeholder={'# 标题\n\n- 列表项 1\n- 列表项 2'}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">状态</label>
          <select name="status" className="rounded border px-3 py-2">
            <option value="draft">草稿</option>
            <option value="published">发布</option>
          </select>
        </div>

        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          保存文章
        </button>
      </form>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">文章管理</h2>

        {posts.length === 0 ? (
          <p className="rounded border p-3 text-sm opacity-70">暂无文章</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="rounded-md border p-4">
              <p className="mb-2 text-xs opacity-60">
                ID: {post.id} | 状态: {post.status} | slug: {post.slug}
              </p>

              <form action={updatePostAction} className="space-y-3">
                <input type="hidden" name="id" value={post.id} />

                <input
                  name="title"
                  defaultValue={post.title}
                  className="w-full rounded border px-3 py-2"
                  required
                />

                <input
                  name="slug"
                  defaultValue={post.slug}
                  className="w-full rounded border px-3 py-2"
                  required
                />

                <input
                  name="category"
                  defaultValue={post.category ?? ''}
                  className="w-full rounded border px-3 py-2"
                  placeholder="例如：tech"
                />

                <input
                  name="tags"
                  defaultValue={post.tags.join(',')}
                  className="w-full rounded border px-3 py-2"
                  placeholder="例如：nextjs,tidb,markdown"
                />

                <textarea
                  name="excerpt"
                  defaultValue={post.excerpt}
                  rows={2}
                  className="w-full rounded border px-3 py-2"
                />

                <textarea
                  name="contentMarkdown"
                  defaultValue={post.contentMarkdown}
                  rows={8}
                  className="w-full rounded border px-3 py-2 font-mono text-sm"
                  required
                />

                <select name="status" defaultValue={post.status} className="rounded border px-3 py-2">
                  <option value="draft">草稿</option>
                  <option value="published">发布</option>
                </select>

                <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">
                  保存修改
                </button>
              </form>

              <form action={deletePostAction} className="mt-3">
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className="rounded bg-red-600 px-3 py-2 text-white">
                  删除文章
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </main>
  )
}
