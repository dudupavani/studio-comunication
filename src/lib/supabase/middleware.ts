import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser();

  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // If user is authenticated and tries to access a public auth path, redirect to dashboard
  if (user && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is NOT authenticated and tries to access a private path, redirect to login
  if (!user && !isPublicPath) {
    // Allow access to the root path if it's not a public auth path (e.g., if it's the main app root)
    // This prevents redirect loops if the root is meant to be a landing page for unauthenticated users
    if (request.nextUrl.pathname === '/') {
      return response; // Or redirect to /login if you want the root to always be login
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response
}
