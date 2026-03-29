export const dynamic = 'force-dynamic'

import Pagination from '@/components/Pagination'
import Editor from '@/components/Editor'
import { headers } from 'next/headers'
import { getAdminLoginLimiter } from '@/lib/rate-limit'
import { getRedis } from '@/lib/redis'
import { verifyAdminPassword } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// 注意这里导出名确保与 lib 对应
import { createPost, getAllPostsForAdminPaged, updatePostById, deletePostById, getSiteLogo, updateSiteLogo } from '@/lib/posts'
import { clearAdminSession, isAdminLoggedIn, setAdminSession } from '@/lib/auth'

export const metadata = {
  title: '内容管理后台',
}

// --- 辅助函数 (保持不变) ---
function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function normalizeTags(raw: string): string | null {
  const value = raw.split(',').map((s) => s.trim()).filter(Boolean).join(',')
  return value || null
}

// --- Actions (全部保持不变) ---
async function loginAction(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limiter = getAdminLoginLimiter()
  try {
    const result = await limiter.limit(ip)
    if (!result.success) redirect('/admin?error=rate_limited')
  } catch {}
  if (!(await verifyAdminPassword(password))) redirect('/admin?error=bad_password')
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
  if (!(await isAdminLoggedIn())) redirect('/admin')
  const title = String(formData.get('title') ?? '').trim()
  const excerpt = String(formData.get('excerpt') ?? '').trim()
  const contentMarkdown = String(formData.get('contentMarkdown') ?? '').trim()
  const status = String(formData.get('status') ?? 'draft') === 'published' ? 'published' : 'draft'
  const rawSlug = String(formData.get('slug') ?? '').trim()
  const slug = toSlug(rawSlug || title) || `post-${Date.now()}`
  const category = String(formData.get('category') ?? '').trim() || null
  const tags = normalizeTags(String(formData.get('tags') ?? ''))

  if (!title || !contentMarkdown || !slug) redirect('/admin?error=invalid_form')
  await createPost({ title, excerpt, contentMarkdown, slug, status, category, tags })
  revalidatePath('/'); revalidatePath('/api/posts'); revalidatePath(`/posts/${slug}`)
  redirect('/admin?success=created')
}

async function updatePostAction(formData: FormData) {
  'use server'
  if (!(await isAdminLoggedIn())) redirect('/admin')
  const id = Number(String(formData.get('id') ?? '0'))
  const title = String(formData.get('title') ?? '').trim()
  const excerpt = String(formData.get('excerpt') ?? '').trim()
  const contentMarkdown = String(formData.get('contentMarkdown') ?? '').trim()
  const status = String(formData.get('status') ?? 'draft') === 'published' ? 'published' : 'draft'
  const rawSlug = String(formData.get('slug') ?? '').trim()
  const slug = toSlug(rawSlug || title) || `post-${Date.now()}`
  const category = String(formData.get('category') ?? '').trim() || null
  const tags = normalizeTags(String(formData.get('tags') ?? ''))

  if (!id || !title || !contentMarkdown || !slug) redirect('/admin?error=invalid_form')
  await updatePostById({ id, title, slug, excerpt, contentMarkdown, status, category, tags })
  
  const redis = getRedis(); await redis.del('cache:posts:*')
  revalidatePath('/'); revalidatePath('/api/posts'); revalidatePath(`/posts/${slug}`)
  redirect('/admin?success=updated')
}

async function deletePostAction(formData: FormData) {
  'use server'
  if (!(await isAdminLoggedIn())) redirect('/admin')
  const id = Number(String(formData.get('id') ?? '0'))
  await deletePostById(id)
  revalidatePath('/'); revalidatePath('/api/posts')
  redirect('/admin?success=deleted')
}

async function updateLogoAction(formData: FormData) {
  'use server'
  if (!(await isAdminLoggedIn())) redirect('/admin')
  const logoUrl = String(formData.get('logoUrl') ?? '').trim()
  await updateSiteLogo(logoUrl)
  revalidatePath('/')
  revalidatePath('/posts/[slug]', 'layout')
  redirect('/admin?success=logo_updated')
}

// --- 核心页面组件 ---
export default async function AdminPage({ searchParams }: { searchParams: Promise<any> }) {
  const loggedIn = await isAdminLoggedIn()
  const params = await searchParams
  
  // 【修改点 1】设置分页参数
  const currentPage = Number(params.page || 1)
  const pageSize = 6

  // 【修改点 2】调用分页函数并解构 items 和 total
  const { items: posts, total } = await getAllPostsForAdminPaged(currentPage, pageSize)
  const currentLogo = await getSiteLogo()

  if (!loggedIn) {
    return (
      <main className="mx-auto max-w-md py-20 px-6">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <form action={loginAction} className="space-y-4 border p-4 rounded">
          <input name="password" type="password" className="w-full border p-2" placeholder="Password" required />
          <button className="w-full bg-black text-white p-2 rounded">Login</button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl py-10 px-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Blog Admin</h1>
        <form action={logoutAction}><button className="text-sm border px-3 py-1 rounded">Logout</button></form>
      </div>

      {/* Logo 管理 (保持不变) */}
      <section className="mb-12 border p-6 rounded-lg bg-gray-50 shadow-sm border-dashed border-blue-200">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          🖼️ Site Logo Settings
        </h2>
        <form action={updateLogoAction} className="space-y-4">
          <div className="flex items-end gap-6">
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-bold uppercase">Logo Image URL</label>
              <input 
                name="logoUrl" 
                defaultValue={currentLogo} 
                placeholder="https://cloudinary.com/..." 
                className="w-full border p-2 rounded mt-1"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                提示：请先在下方创建文章的图片上传处获取图片链接，粘贴至此处。
              </p>
            </div>
            {currentLogo && (
              <div className="w-12 h-12 border rounded bg-white flex items-center justify-center overflow-hidden p-1">
                <img src={currentLogo} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
              Update Logo
            </button>
          </div>
        </form>
      </section>

      {/* 新建文章 (保持不变) */}
      <section className="mb-12 border p-6 rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-bold mb-4">Create New Post</h2>
        <form action={createPostAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input name="title" placeholder="Title" className="border p-2 rounded" required />
            <input name="slug" placeholder="Slug (optional)" className="border p-2 rounded" />
            <input name="category" placeholder="Category" className="border p-2 rounded" />
            <input name="tags" placeholder="Tags (comma separated)" className="border p-2 rounded" />
          </div>
          <textarea name="excerpt" placeholder="Excerpt" className="w-full border p-2 rounded" rows={2} />
          <Editor name="contentMarkdown" />
          <div className="flex justify-between items-center">
            <select name="status" className="border p-2 rounded">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <button className="bg-black text-white px-6 py-2 rounded font-medium">Save Post</button>
          </div>
        </form>
      </section>

      {/* 文章管理 (渲染 posts 数组) */}
      <section className="space-y-8">
        <h2 className="text-xl font-bold">Manage Posts ({total})</h2>
        {posts.map((post) => (
          <div key={post.id} className="border p-6 rounded-lg bg-gray-50">
            <form action={updatePostAction} className="space-y-4">
              <input type="hidden" name="id" value={post.id} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase">Title</label>
                  <input name="title" defaultValue={post.title} className="w-full border p-2 rounded font-bold" required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase">Slug</label>
                  <input name="slug" defaultValue={post.slug} className="w-full border p-2 rounded" required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase">Category</label>
                  <input name="category" defaultValue={post.category ?? ''} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase">Tags</label>
                  <input name="tags" defaultValue={post.tags?.join(',')} className="w-full border p-2 rounded" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase">Excerpt</label>
                <textarea name="excerpt" defaultValue={post.excerpt} className="w-full border p-2 rounded" rows={2} />
              </div>

              <Editor name="contentMarkdown" defaultValue={post.contentMarkdown} />

              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div className="flex gap-4 items-center">
                  <select name="status" defaultValue={post.status} className="border p-2 rounded text-sm">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">Update</button>
                </div>
              </div>
            </form>

            <div className="text-right mt-2">
              <form action={deletePostAction}>
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className="text-red-600 text-sm hover:underline">
                  Delete Post
                </button>
              </form>
            </div>
          </div>
        ))}
      </section>

      {/* 【修改点 3】在底部添加分页组件 */}
      <Pagination total={total} pageSize={pageSize} currentPage={currentPage} />
    </main>
  )
}