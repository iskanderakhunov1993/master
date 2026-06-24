import { NextRequest, NextResponse } from 'next/server'

const AUTH_API_PATHS = ['/api/auth/login', '/api/auth/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  // API routes (except auth endpoints) — return 401 JSON
  if (pathname.startsWith('/api/')) {
    if (AUTH_API_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Protected page routes — redirect to /login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/client/:path*', '/master/:path*', '/admin/:path*', '/api/:path*'],
}
