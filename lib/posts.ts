import { getDbPool, type DbRow } from '@/lib/db'

export type PostStatus = 'draft' | 'published'

export type PostSummary = {
  id: number
  slug: string
  title: string
  excerpt: string
  status: PostStatus
  publishedAt: string | null
  category: string | null
  tags: string[]
}

export type PostDetail = PostSummary & {
  contentMarkdown: string
  createdAt: string
  updatedAt: string
}

let schemaInitPromise: Promise<void> | null = null

async function ensurePostsSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const pool = getDbPool()

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS posts (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          slug VARCHAR(191) NOT NULL UNIQUE,
          title VARCHAR(255) NOT NULL,
          excerpt TEXT NOT NULL,
          content_markdown MEDIUMTEXT NOT NULL,
          status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
          published_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      )

      await pool.execute(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL`)
      await pool.execute(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags VARCHAR(255) NULL`)

      try {
        await pool.execute(`CREATE INDEX idx_posts_status_published_at ON posts(status, published_at)`)
      } catch (error) {
        const maybeMysqlError = error as { errno?: number }
        if (maybeMysqlError.errno !== 1061) throw error
      }

      try {
        await pool.execute(`CREATE INDEX idx_posts_category ON posts(category)`)
      } catch (error) {
        const maybeMysqlError = error as { errno?: number }
        if (maybeMysqlError.errno !== 1061) throw error
      }
    })()
  }

  await schemaInitPromise
}

type PostRow = DbRow & {
  id: number
  slug: string
  title: string
  excerpt: string
  content_markdown: string
  status: PostStatus
  published_at: Date | null
  created_at: Date
  updated_at: Date
  category: string | null
  tags: string | null
}

function toIsoString(value: Date | null): string | null {
  if (!value) return null
  return value.toISOString()
}

function normalizeTags(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function toSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    status: row.status,
    publishedAt: toIsoString(row.published_at),
    category: row.category,
    tags: normalizeTags(row.tags),
  }
}

function toDetail(row: PostRow): PostDetail {
  return {
    ...toSummary(row),
    contentMarkdown: row.content_markdown,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  await ensurePostsSchema()
  const pool = getDbPool()

  const [rows] = await pool.query<PostRow[]>(
    `SELECT id, slug, title, excerpt, content_markdown, status, published_at, created_at, updated_at, category, tags
     FROM posts
     WHERE status = 'published'
     ORDER BY published_at DESC, id DESC`,
  )

  return rows.map(toSummary)
}

export async function getPublishedPostsPaged(input: {
  page: number
  pageSize: number
  category?: string
  tag?: string
}): Promise<{ items: PostSummary[]; total: number; page: number; pageSize: number }> {
  await ensurePostsSchema()
  const pool = getDbPool()

  const page = Math.max(1, Number(input.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(input.pageSize) || 10))
  const offset = (page - 1) * pageSize

  const where: string[] = [`status = 'published'`]
  const args: Array<string | number> = []

  if (input.category) {
    where.push(`category = ?`)
    args.push(input.category)
  }

  if (input.tag) {
    where.push(`FIND_IN_SET(?, REPLACE(IFNULL(tags, ''), ' ', ''))`)
    args.push(input.tag)
  }

  const whereSql = `WHERE ${where.join(' AND ')}`

  const [countRows] = await pool.query<Array<{ total: number }>>(
    `SELECT COUNT(*) AS total FROM posts ${whereSql}`,
    args,
  )

  const total = Number(countRows[0]?.total ?? 0)

  const [rows] = await pool.query<PostRow[]>(
    `SELECT id, slug, title, excerpt, content_markdown, status, published_at, created_at, updated_at, category, tags
     FROM posts
     ${whereSql}
     ORDER BY published_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...args, pageSize, offset],
  )

  return {
    items: rows.map(toSummary),
    total,
    page,
    pageSize,
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<PostDetail | null> {
  await ensurePostsSchema()
  const pool = getDbPool()

  const [rows] = await pool.query<PostRow[]>(
    `SELECT id, slug, title, excerpt, content_markdown, status, published_at, created_at, updated_at, category, tags
     FROM posts
     WHERE slug = ? AND status = 'published'
     LIMIT 1`,
    [slug],
  )

  if (rows.length === 0) return null
  return toDetail(rows[0])
}

export async function createPost(input: {
  title: string
  slug: string
  excerpt: string
  contentMarkdown: string
  status: PostStatus
  category?: string | null
  tags?: string | null
}): Promise<void> {
  await ensurePostsSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO posts (title, slug, excerpt, content_markdown, status, published_at, category, tags)
     VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END, ?, ?)`,
    [
      input.title,
      input.slug,
      input.excerpt,
      input.contentMarkdown,
      input.status,
      input.status,
      input.category ?? null,
      input.tags ?? null,
    ],
  )
}

export async function getAllPostsForAdmin(): Promise<PostDetail[]> {
  await ensurePostsSchema()
  const pool = getDbPool()

  const [rows] = await pool.query<PostRow[]>(
    `SELECT id, slug, title, excerpt, content_markdown, status, published_at, created_at, updated_at, category, tags
     FROM posts
     ORDER BY id DESC`,
  )

  return rows.map(toDetail)
}

export async function updatePostById(input: {
  id: number
  title: string
  slug: string
  excerpt: string
  contentMarkdown: string
  status: PostStatus
  category?: string | null
  tags?: string | null
}): Promise<void> {
  await ensurePostsSchema()
  const pool = getDbPool()

  try {
    await pool.execute(
      `UPDATE posts
       SET title = ?, slug = ?, excerpt = ?, content_markdown = ?, status = ?, category = ?, tags = ?,
           published_at = CASE WHEN ? = 'published' THEN IFNULL(published_at, CURRENT_TIMESTAMP) ELSE NULL END
       WHERE id = ?`,
      [
        input.title,
        input.slug,
        input.excerpt,
        input.contentMarkdown,
        input.status,
        input.category ?? null,
        input.tags ?? null,
        input.status,
        input.id,
      ],
    )
  } catch (error) {
    const err = error as { errno?: number }
    if (err.errno !== 1054) throw error

    await pool.execute(
      `UPDATE posts
       SET title = ?, slug = ?, excerpt = ?, content_markdown = ?, status = ?,
           published_at = CASE WHEN ? = 'published' THEN IFNULL(published_at, CURRENT_TIMESTAMP) ELSE NULL END
       WHERE id = ?`,
      [
        input.title,
        input.slug,
        input.excerpt,
        input.contentMarkdown,
        input.status,
        input.status,
        input.id,
      ],
    )
  }
}

export async function deletePostById(id: number): Promise<void> {
  await ensurePostsSchema()
  const pool = getDbPool()
  await pool.execute(`DELETE FROM posts WHERE id = ?`, [id])
}
