import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get("session")?.value

  console.log(`Middleware: ${pathname}, Session: ${sessionToken ? "exists" : "none"}`)

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup", "/set-password", "/maintenance", "/setup", "/fix-app-url", "/test-db"]

  // API routes that don't require authentication
  const publicApiRoutes = [
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/set-password",
    "/api/auth/strava/callback",
    "/api/health",
    "/api/test-database",
    "/api/fix-app-url",
    "/api/auth/test-session",
  ]

  // Check if the current path is public
  const isPublicRoute = publicRoutes.includes(pathname) || publicApiRoutes.some((route) => pathname.startsWith(route))

  // If accessing a public route, allow it
  if (isPublicRoute) {
    console.log(`Middleware: Allowing public route ${pathname}`)
    return NextResponse.next()
  }

  // For protected routes, check if session exists
  if (!sessionToken) {
    console.log(`Middleware: No session for ${pathname}, redirecting to login`)
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  console.log(`Middleware: Session exists for ${pathname}, allowing`)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
