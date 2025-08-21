import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  
  // Log para telemetria (opcional)
  const isLegacyAdminPath = pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
  if (isLegacyAdminPath) {
    console.log(`[Redirect] ${req.method} ${pathname} -> legacy admin path accessed`);
  }

  // /admin/users -> /users
  if (pathname === "/admin/users" || pathname === "/admin/users/") {
    const url = req.nextUrl.clone();
    url.pathname = "/users";
    return NextResponse.redirect(url, 308);
  }
  
  // /admin/users/[id]/edit -> /users/[id]/edit
  const adminUserEdit = pathname.match(/^\/admin\/users\/([^\/]+)\/edit\/?$/);
  if (adminUserEdit) {
    const userId = adminUserEdit[1];
    const url = req.nextUrl.clone();
    url.pathname = `/users/${userId}/edit`;
    return NextResponse.redirect(url, 308);
  }

  // API redirects
  // /api/admin/users/[id]/disable -> /api/users/[id]/disable
  const apiAdminUserDisable = pathname.match(/^\/api\/admin\/users\/([^\/]+)\/disable\/?$/);
  if (apiAdminUserDisable) {
    const userId = apiAdminUserDisable[1];
    const url = req.nextUrl.clone();
    url.pathname = `/api/users/${userId}/disable`;
    return NextResponse.redirect(url, 308);
  }
  
  // /api/admin/users/[id]/enable -> /api/users/[id]/enable
  const apiAdminUserEnable = pathname.match(/^\/api\/admin\/users\/([^\/]+)\/enable\/?$/);
  if (apiAdminUserEnable) {
    const userId = apiAdminUserEnable[1];
    const url = req.nextUrl.clone();
    url.pathname = `/api/users/${userId}/enable`;
    return NextResponse.redirect(url, 308);
  }
  
  // /api/admin/users/create -> /api/users/create
  if (pathname === "/api/admin/users/create" || pathname === "/api/admin/users/create/") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/users/create";
    return NextResponse.redirect(url, 308);
  }
  
  // /api/admin/users/create-and-link -> /api/users/create-and-link
  if (pathname === "/api/admin/users/create-and-link" || pathname === "/api/admin/users/create-and-link/") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/users/create-and-link";
    return NextResponse.redirect(url, 308);
  }
  
  // /api/admin/users/invite-magic -> /api/users/invite-magic
  if (pathname === "/api/admin/users/invite-magic" || pathname === "/api/admin/users/invite-magic/") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/users/invite-magic";
    return NextResponse.redirect(url, 308);
  }
  
  // /api/admin/orgs -> /api/orgs
  if (pathname === "/api/admin/orgs" || pathname === "/api/admin/orgs/") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/orgs";
    return NextResponse.redirect(url, 308);
  }
  
  // /api/admin/orgs/[orgSlug]/units -> /api/orgs/[orgSlug]/units
  const apiAdminOrgUnits = pathname.match(/^\/api\/admin\/orgs\/([^\/]+)\/units\/?$/);
  if (apiAdminOrgUnits) {
    const orgSlug = apiAdminOrgUnits[1];
    const url = req.nextUrl.clone();
    url.pathname = `/api/orgs/${orgSlug}/units`;
    return NextResponse.redirect(url, 308);
  }

  // /orgs/:orgSlug/units/:unitSlug -> /units/:unitSlug
  const orgsUnits = pathname.match(/^\/orgs\/([^\/]+)\/units\/([^\/]+)\/?$/);
  if (orgsUnits) {
    const unitSlug = orgsUnits[2];
    const url = req.nextUrl.clone();
    url.pathname = `/units/${unitSlug}`;
    return NextResponse.redirect(url, 308);
  }

  // /orgs/:orgSlug/settings -> /settings
  const orgsSettings = pathname.match(/^\/orgs\/([^\/]+)\/settings\/?$/);
  if (orgsSettings) {
    const url = req.nextUrl.clone();
    url.pathname = `/settings`;
    return NextResponse.redirect(url, 308);
  }

  // /org/units -> /units
  if (/^\/org\/units\/?$/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/units`;
    return NextResponse.redirect(url, 308);
  }

  // /org/settings -> /settings
  if (/^\/org\/settings\/?$/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/settings`;
    return NextResponse.redirect(url, 308);
  }

  // Removido redirecionamento de /users -> /admin/users
  // A rota /users agora aponta diretamente para a página de usuários

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};