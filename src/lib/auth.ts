import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'dev-secret-change-in-production'
)

const COOKIE_NAME = 'token'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAuthUser(): Promise<{
  id: string
  role: string
  name: string
  email: string
} | null> {
  try {
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get(COOKIE_NAME)
    if (!tokenCookie?.value) return null

    const { payload } = await jwtVerify(tokenCookie.value, SECRET)
    const userId = payload.sub
    if (!userId) return null

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    })

    return user
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<{
  id: string
  role: string
  name: string
  email: string
}> {
  const user = await getAuthUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}

export async function requireRole(role: string): Promise<{
  id: string
  role: string
  name: string
  email: string
}> {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}
