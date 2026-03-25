# 博客下一阶段：数据库 + 后台 + Markdown

面向当前栈：**Next.js 16 App Router + TypeScript + TiDB Cloud Starter**。

---

## 推荐顺序（别一次全上）

1. **接数据库 + 表结构** → 把 `/api/posts` 读真实数据
2. **Markdown 渲染** → 文章页展示 `content`（Markdown 字符串）
3. **后台发布** → 仅管理员可写库（先简单认证，再增强）

这样每一步都能单独跑通、回滚成本低。

---

## 1. TiDB Cloud（Starter）接库

### 1.1 控制台准备

- 在 TiDB Cloud 创建 **Serverless** Starter 集群
- 拿到 **连接信息**（host、port、user、password、database）
- 注意：Serverless 通常要求 **TLS/SSL**（Node 里用 `mysql2` 时 often `ssl: { rejectUnauthorized: true }` 或按官方文档）

### 1.2 Node 侧建议

- **驱动**：`mysql2`（生态成熟，和 TiDB MySQL 协议兼容）
- **ORM（可选）**：`drizzle-orm` + `drizzle-kit`（类型友好、迁移清晰）  
  或 **Prisma**（上手快，但 TiDB 有些高级特性需核对版本）

### 1.3 最小表结构示例

```sql
CREATE TABLE posts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(191) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content_md MEDIUMTEXT NOT NULL,
  published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

- 对外 URL 建议用 **`slug`**（如 `hello-world`），比数字 ID 更友好
- `content_md` 存 **Markdown 原文**（不要提前渲染成 HTML 存库，除非你有缓存策略）

### 1.4 环境变量

在项目根目录 `.env.local`（不要提交 Git）：

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DBNAME?sslaccept=strict
```

> 具体 URL 以 TiDB Cloud 控制台给出的为准；端口常见 `4000`（以控制台为准）。

---

## 2. API 与页面改造思路

- **`GET /api/posts`**：`SELECT` 已发布文章列表（`published = 1`），返回 `id/slug/title/created_at` 等
- **`GET /api/posts/[id]`** 或更推荐 **`GET /api/posts/by-slug/[slug]`**：按 slug 取单篇
- 首页 `app/page.tsx`：用 `fetch('/api/posts')`（客户端）或 **Server Component 直接调库**（推荐，少一层 HTTP）
- 文章页 `app/post/[slug]/page.tsx`：动态段从 `id` 改为 `slug` 更自然

> 同一项目里，**Server Component 直接查库**通常比「服务端再 fetch 自己 API」更简单、更稳。

---

## 3. Markdown 渲染

### 3.1 常用组合

- `react-markdown`
- `remark-gfm`（表格、任务列表等 GitHub Flavored Markdown）
- `rehype-sanitize`（强烈建议：防 XSS，尤其以后后台可输入 HTML）

### 3.2 渲染位置

- 文章正文用 **Client Component** 包一层 `MarkdownBody`（因为 `react-markdown` 在 RSC 里可用性取决于版本，但通常客户端组件最省事）
- 或使用支持 RSC 的 MDX 方案（更重，后期再上）

### 3.3 样式

- 给正文容器加 `prose`（Tailwind Typography 插件）或手写 `.markdown-body h1/h2/...`

---

## 4. 后台管理（发布文章）

### 4.1 路由与页面

- `app/admin/layout.tsx`：后台布局（侧边栏 / 标题）
- `app/admin/posts/new/page.tsx`：新建文章表单（标题、slug、Markdown 正文、是否发布）
- `app/admin/posts/[id]/edit/page.tsx`：编辑（可选第二期）

### 4.2 写入方式（二选一）

- **Server Actions**（推荐）：`action` 里校验 → `INSERT`/`UPDATE`
- **Route Handler**：`POST /api/admin/posts`（需同样做鉴权）

### 4.3 鉴权（从简到强）

| 阶段 | 做法 |
|------|------|
| MVP | 环境变量 `ADMIN_PASSWORD` + 登录页写 cookie/session（`jose` + HttpOnly cookie） |
| 进阶 | NextAuth / Clerk / Auth.js + 只允许你的邮箱 |
| 生产 | 角色权限、审计日志、CSRF、速率限制 |

### 4.4 安全底线

- 管理路由用 **middleware** 保护：`/admin/*` 未登录重定向
- 所有写接口 **必须** 服务端校验，不信任前端
- Markdown 渲染务必 **sanitize**

---

## 5. 部署注意（Vercel / 自建）

- TiDB Serverless 通常 **允许公网连接**；把连接串放 **环境变量**
- 若用 Edge/Serverless，注意 **连接数** 与 **连接池**（`mysql2` 池在 Serverless 上要谨慎，可用 HTTP 型 TiDB 驱动或官方推荐的 Serverless 连接方式）

---

## 6. 你项目里可以删的冗余

- 若已全面用 Next.js App Router，一般 **不需要** `react-router-dom`（避免两套路由混用）

---

## 建议的下一步（你选一个，我可以在仓库里直接帮你落地代码）

1. 加 `mysql2` + `.env.example` + `lib/db.ts` + 把 `GET /api/posts` 改为查库  
2. 加 `react-markdown` + `remark-gfm` + `rehype-sanitize`，文章页渲染 Markdown  
3. 加 `/admin` 最小发布页 + 简单密码登录（cookie）

---

## 参考资源

- [TiDB Cloud 文档](https://docs.pingcap.com/tidbcloud/)
- [Drizzle ORM - MySQL](https://orm.drizzle.team/docs/get-started-mysql)
- [react-markdown](https://github.com/remarkjs/react-markdown)
