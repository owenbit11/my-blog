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

export async function verifyAdminPassword(plainPassword: string): Promise<boolean> {
  const hash = requiredEnv('ADMIN_PASSWORD_HASH')
  return bcrypt.compare(plainPassword, hash)
}

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
