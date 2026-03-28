import { getDbPool, type DbRow } from '@/lib/db'

export type PostStatus = 'draft' | 'published'
export type PostSummary = { id: number; slug: string; title: string; excerpt: string; status: PostStatus; publishedAt: string | null; category: string | null; tags: string[] }
export type PostDetail = PostSummary & { contentMarkdown: string; createdAt: string; updatedAt: string }

type PostRow = DbRow & { id: number; slug: string; title: string; excerpt: string; content_markdown: string; status: PostStatus; published_at: Date | null; created_at: Date; updated_at: Date; category: string | null; tags: string | null }

const toDetail = (row: PostRow): PostDetail => ({
  id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, status: row.status,
  publishedAt: row.published_at ? row.published_at.toISOString() : null,
  category: row.category, tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  contentMarkdown: row.content_markdown, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
})

async function ensurePostsSchema(): Promise<void> {
  const pool = getDbPool()
  await pool.execute(`CREATE TABLE IF NOT EXISTS posts (id BIGINT PRIMARY KEY AUTO_INCREMENT, slug VARCHAR(191) NOT NULL UNIQUE, title VARCHAR(255) NOT NULL, excerpt TEXT NOT NULL, content_markdown MEDIUMTEXT NOT NULL, status ENUM('draft', 'published') NOT NULL DEFAULT 'draft', published_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT PRIMARY KEY DEFAULT 1,
      logo_url VARCHAR(255) DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  // 插入初始数据（如果不存在）
  await pool.execute(`INSERT IGNORE INTO site_settings (id, logo_url) VALUES (1, '')`)
}


// --- 修复后的核心导出函数 ---

export async function getPublishedPostsPaged(input: { page: number; pageSize: number; category?: string; tag?: string }) {
  await ensurePostsSchema()
  const pool = getDbPool()
  const offset = (input.page - 1) * input.pageSize

  // 1. 查询总数 (为了修复 app/page.tsx 的报错)
  const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as total FROM posts WHERE status = 'published'`)
  const total = countRows[0]?.total || 0

  // 2. 查询分页数据
  const [rows] = await pool.query<PostRow[]>(
    `SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    [input.pageSize, offset]
  )

  return { 
    items: rows.map(toDetail), 
    total: Number(total) // 确保返回 total 字段
  }
}

export async function getPostById(id: string | number): Promise<PostDetail | null> {
  await ensurePostsSchema()
  const [rows] = await getDbPool().query<PostRow[]>(`SELECT * FROM posts WHERE id = ? LIMIT 1`, [id])
  return rows.length > 0 ? toDetail(rows[0]) : null
}

export async function deletePostById(id: number): Promise<void> {
  await ensurePostsSchema()
  await getDbPool().execute(`DELETE FROM posts WHERE id = ?`, [id])
}

export async function getPublishedPostBySlug(slug: string) {
  const [rows] = await getDbPool().query<PostRow[]>(`SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1`, [slug])
  return rows.length > 0 ? toDetail(rows[0]) : null
}

export async function getAllPostsForAdmin() {
  const [rows] = await getDbPool().query<PostRow[]>(`SELECT * FROM posts ORDER BY id DESC`)
  return rows.map(toDetail)
}

export async function createPost(input: any) {
  const pool = getDbPool()
  await pool.execute(
    `INSERT INTO posts (title, slug, excerpt, content_markdown, status, category, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.title, input.slug, input.excerpt, input.contentMarkdown, input.status, input.category, input.tags]
  )
}

export async function updatePostById(input: any) {
  const pool = getDbPool()
  await pool.execute(
    `UPDATE posts SET title=?, slug=?, excerpt=?, content_markdown=?, status=?, category=?, tags=? WHERE id=?`,
    [input.title, input.slug, input.excerpt, input.contentMarkdown, input.status, input.category, input.tags, input.id]
  )
}

/**
 * 获取所有已发布的文章（修复版：查询所有字段以适配 toDetail）
 */
export async function getAllPublishedPosts(): Promise<PostSummary[]> {
  await ensurePostsSchema()
  const pool = getDbPool()
  
  // 修改点：使用 SELECT *，确保 row 包含 created_at 和 updated_at
  const [rows] = await pool.query<PostRow[]>(
    `SELECT * FROM posts 
     WHERE status = 'published' 
     ORDER BY published_at DESC`
  )
  
  // 现在 toDetail 不会因为找不到字段而报错了
  return rows.map(toDetail)
}

export async function getSiteLogo(): Promise<string> {
  const [rows] = await getDbPool().query<any[]>(`SELECT logo_url FROM site_settings WHERE id = 1`);
  return rows[0]?.logo_url || '';
}

export async function updateSiteLogo(url: string) {
  await getDbPool().execute(`UPDATE site_settings SET logo_url = ? WHERE id = 1`, [url]);
}