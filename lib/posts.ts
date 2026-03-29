import { getDbPool, type DbRow } from '@/lib/db'

// --- 类型定义 ---
export type PostStatus = 'draft' | 'published'
export type PostSummary = { 
  id: number; 
  slug: string; 
  title: string; 
  excerpt: string; 
  status: PostStatus; 
  publishedAt: string | null; 
  category: string | null; 
  tags: string[] 
}
export type PostDetail = PostSummary & { 
  contentMarkdown: string; 
  createdAt: string; 
  updatedAt: string 
}

type PostRow = DbRow & { 
  id: number; slug: string; title: string; excerpt: string; 
  content_markdown: string; status: PostStatus; 
  published_at: Date | null; created_at: Date; updated_at: Date; 
  category: string | null; tags: string | null 
}

const toDetail = (row: PostRow): PostDetail => ({
  id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, status: row.status,
  publishedAt: row.published_at ? row.published_at.toISOString() : null,
  category: row.category, 
  tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  contentMarkdown: row.content_markdown, 
  createdAt: row.created_at.toISOString(), 
  updatedAt: row.updated_at.toISOString(),
})

// --- 数据库初始化 ---
async function ensurePostsSchema(): Promise<void> {
  const pool = getDbPool()
  await pool.execute(`CREATE TABLE IF NOT EXISTS posts (id BIGINT PRIMARY KEY AUTO_INCREMENT, slug VARCHAR(191) NOT NULL UNIQUE, title VARCHAR(255) NOT NULL, excerpt TEXT NOT NULL, content_markdown MEDIUMTEXT NOT NULL, status ENUM('draft', 'published') NOT NULL DEFAULT 'draft', published_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, category VARCHAR(100) NULL, tags TEXT NULL)`)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT PRIMARY KEY DEFAULT 1,
      logo_url VARCHAR(255) DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  await pool.execute(`INSERT IGNORE INTO site_settings (id, logo_url) VALUES (1, '')`)
}

// --- 分页核心内部函数 ---
async function getPagedPostsInternal(input: { 
  page: number; 
  pageSize: number; 
  category?: string; 
  tag?: string; 
  isAdmin: boolean 
}) {
  await ensurePostsSchema()
  const pool = getDbPool()
  const { page, pageSize, category, tag, isAdmin } = input
  const offset = (page - 1) * pageSize

  let whereConditions = isAdmin ? [] : ["status = 'published'"]
  let sqlParams: any[] = []

  if (category) {
    whereConditions.push("category = ?")
    sqlParams.push(category)
  }
  if (tag) {
    whereConditions.push("tags LIKE ?")
    sqlParams.push(`%${tag}%`)
  }

  const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : ""

  // 1. 获取总数
  const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as total FROM posts ${whereClause}`, sqlParams)
  const total = countRows[0]?.total || 0

  // 前台：只看发布时间（因为只有已发布的）
// 后台：优先看发布时间，如果没发布（草稿），则按创建时间排序，确保新写的草稿排在最前
const orderBy = isAdmin 
? "COALESCE(published_at, created_at) DESC, id DESC" 
: "published_at DESC, created_at DESC";

// 3. 执行查询
const [rows] = await pool.query<PostRow[]>(
`SELECT * FROM posts ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
[...sqlParams, pageSize, offset]
);

  return { items: rows.map(toDetail), total: Number(total) }
}

// --- 导出函数 ---

// 适配首页对象传参: { page, pageSize, category, tag }
export async function getPublishedPostsPaged(input: { page: number; pageSize: number; category?: string; tag?: string }) {
  return getPagedPostsInternal({ ...input, isAdmin: false })
}

// 适配后台管理传参: (page, pageSize)
export async function getAllPostsForAdminPaged(page: number, pageSize: number) {
  return getPagedPostsInternal({ page, pageSize, isAdmin: true })
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

export async function createPost(input: any) {
  const pool = getDbPool()
  await pool.execute(
    `INSERT INTO posts (title, slug, excerpt, content_markdown, status, category, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.title, input.slug, input.excerpt, input.contentMarkdown, input.status, input.category, input.tags]
  )
}

export async function updatePostById(input: any) {
  const pool = getDbPool()
  // 1. 先获取原文章信息，判断是否是第一次发布
  const [existing] = await pool.query<any[]>(
    `SELECT status, published_at FROM posts WHERE id = ?`, 
    [input.id]
  )
  
  let publishedAt = existing[0]?.published_at;

  // 2. 逻辑：如果当前设为 published，且数据库里还是 draft 或 published_at 为空
  // 则更新发布时间为当前时间
  if (input.status === 'published' && !publishedAt) {
    publishedAt = new Date();
  } else if (input.status === 'draft') {
    // 如果改回草稿，通常可以选择清除发布时间，或者保留。这里建议保留或根据需求处理。
    // publishedAt = null; 
  }

  // 3. 执行更新（增加 published_at 字段的更新）
  // 注意：确保 WHERE id = ? 这里的 input.id 是有效的
  try {
    await pool.execute(
      `UPDATE posts 
       SET title=?, slug=?, excerpt=?, content_markdown=?, status=?, category=?, tags=?, published_at=? 
       WHERE id=?`,
      [
        input.title, 
        input.slug, 
        input.excerpt, 
        input.contentMarkdown, 
        input.status, 
        input.category, 
        input.tags, 
        publishedAt, // 新增
        input.id     // 确保这个 ID 不为空
      ]
    )
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error(`更新失败：Slug "${input.slug}" 已被其他文章占用，请换一个。`);
    }
    throw error;
  }
}

export async function getAllPublishedPosts(): Promise<PostSummary[]> {
  await ensurePostsSchema()
  const [rows] = await getDbPool().query<PostRow[]>(`SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC`)
  return rows.map(toDetail)
}

export async function getSiteLogo(): Promise<string> {
  const [rows] = await getDbPool().query<any[]>(`SELECT logo_url FROM site_settings WHERE id = 1`)
  return rows[0]?.logo_url || ''
}

export async function updateSiteLogo(url: string) {
  await getDbPool().execute(`UPDATE site_settings SET logo_url = ? WHERE id = 1`, [url])
}