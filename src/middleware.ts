import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  // /users -> /admin/users (padronizar gestão em /admin/users)
  if (/^\/users\/?$/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/admin/users`;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};