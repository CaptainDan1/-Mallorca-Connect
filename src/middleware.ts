import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE);
  if (cookie?.value === "true") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const target = request.nextUrl.pathname + request.nextUrl.search;
  if (target && target !== "/") {
    loginUrl.searchParams.set("next", target);
  }
  return NextResponse.redirect(loginUrl);
}

// Pfade, die NICHT geschuetzt werden:
//   /login, /api/auth, /_next, /favicon.ico, statische Assets und Bilder.
// Die Matcher-Syntax schliesst diese komplett von der Middleware aus,
// damit kein Redirect-Loop entsteht.
export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf)).*)",
  ],
};
