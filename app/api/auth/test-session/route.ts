import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSessionUser } from "@/lib/simple-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    console.log("Test session - Token exists:", !!sessionToken)
    console.log("Test session - Token value:", sessionToken?.substring(0, 8) + "...")

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: "No session token found",
        cookies: cookieStore.getAll().map((c) => ({ name: c.name, value: c.value.substring(0, 8) + "..." })),
      })
    }

    const user = await getSessionUser(sessionToken)
    console.log("Test session - User found:", user ? user.username : "No user")

    return NextResponse.json({
      success: !!user,
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          }
        : null,
      sessionToken: sessionToken.substring(0, 8) + "...",
      cookies: cookieStore.getAll().map((c) => ({ name: c.name, value: c.value.substring(0, 8) + "..." })),
    })
  } catch (error) {
    console.error("Session test error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    })
  }
}
