import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, AUTH_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAuth = request.cookies.get(AUTH_COOKIE)?.value === "true";
  const hasAdmin = request.cookies.get(ADMIN_COOKIE)?.value === "true";

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (isAdminArea) {
    // Zuerst: normales Login-Cookie verlangen.
    if (!hasAuth) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
    // Auf /admin/login reicht das normale Cookie, sonst entsteht Redirect-Loop.
    if (isAdminLogin) {
      return NextResponse.next();
    }
    // Alles andere unter /admin braucht zusaetzlich das Admin-Cookie.
    if (!hasAdmin) {
      const adminLoginUrl = new URL("/admin/login", request.url);
      adminLoginUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(adminLoginUrl);
    }
    return NextResponse.next();
  }

  // Standardpfad: nur normales Login-Cookie verlangen.
  if (hasAuth) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const target = pathname + search;
  if (target && target !== "/") {
    loginUrl.searchParams.set("next", target);
  }
  return NextResponse.redirect(loginUrl);
}

// Pfade, die NICHT geschuetzt werden:
//   /login, /api/auth, /api/admin/auth, /_next, /favicon.ico, statische Assets.
// /admin/login laeuft bewusst weiter durch die Middleware, damit dort
// das normale PAGE-Cookie geprueft wird.
export const config = {
  matcher: [
    "/((?!login|api/auth|api/admin/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf)).*)",
  ],
};
