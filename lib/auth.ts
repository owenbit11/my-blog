import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

const SESSION_COOKIE = 'admin_session'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function sessionValue(): string {
  // 用 hash 作为会话绑定基准，不再明文密码比较
  const hash = requiredEnv('ADMIN_PASSWORD_HASH')
  const secret = requiredEnv('ADMIN_SESSION_SECRET')
  return crypto.createHmac('sha256', secret).update(hash).digest('hex')
}

// ... 其他 import 保持不变

/**
 * 校验管理员密码
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  // 1. 优先校验明文密码 (方案 A)
  const rawPassword = process.env.RAW_ADMIN_PASSWORD;
  if (rawPassword && password === rawPassword) {
    return true;
  }

  // 2. 备选方案：校验哈希密码 (如果你之前存过 ADMIN_PASSWORD_HASH)
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    try {
      const bcrypt = await import('bcryptjs');
      return bcrypt.compareSync(password, hash);
    } catch (e) {
      console.error('Bcrypt 校验失败:', e);
    }
  }

  return false;
}

// ... 文件的其他部分 (setAdminSession, isAdminLoggedIn 等) 保持不变

export async function isAdminLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return false
  return token === sessionValue()
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 8,
  })
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
