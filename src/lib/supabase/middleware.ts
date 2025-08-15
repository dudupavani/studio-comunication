import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Verifica se a URL tem um hash com access_token (Magic Link)
  const hasAccessToken =
    request.nextUrl.hash && request.nextUrl.hash.includes("access_token=");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publicPaths = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/confirm",
    "/auth/callback",
    "/auth/force-password",
    "/auth/magic",
  ];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Se tiver access_token no hash, considera como autenticado para este request
  const isAuthenticated = user || hasAccessToken;

  // Se estiver em /auth/confirm com access_token no hash, permite continuar
  if (request.nextUrl.pathname === "/auth/confirm" && hasAccessToken) {
    return response;
  }

  // If user is authenticated and tries to access a public auth path, redirect to dashboard
  if (
    isAuthenticated &&
    isPublicPath &&
    !request.nextUrl.pathname.startsWith("/auth/force-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is NOT authenticated and tries to access a private path, redirect to login
  if (!isAuthenticated && !isPublicPath) {
    // Allow access to the root path if it's not a public auth path
    if (request.nextUrl.pathname === "/") {
      return response;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
