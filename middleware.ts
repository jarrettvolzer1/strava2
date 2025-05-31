import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionUser } from "@/lib/simple-auth"

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function rateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const key = `rate_limit_${ip}`
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

  // Rate limiting for login attempts
  if (pathname === "/api/auth/login" && request.method === "POST") {
    if (!rateLimit(ip, 5, 300000)) {
      // 5 attempts per 5 minutes
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 })
    }
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (!rateLimit(ip, 100, 60000)) {
      // 100 requests per minute
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }
  }

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
  ]

  // Check if the current path is public
  const isPublicRoute = publicRoutes.includes(pathname) || publicApiRoutes.some((route) => pathname.startsWith(route))

  // If accessing a public route, allow it
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, check authentication
  const sessionToken = request.cookies.get("session")?.value

  if (!sessionToken) {
    console.log(`No session token found for ${pathname}, redirecting to login`)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const user = await getSessionUser(sessionToken)
    if (!user) {
      console.log(`Invalid session for ${pathname}, redirecting to login`)
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Admin route protection
    if (pathname.startsWith("/admin") && user.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    console.log(`User ${user.username} authenticated for ${pathname}`)
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Add security headers
  const response = NextResponse.next()

  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.strava.com;",
  )

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
