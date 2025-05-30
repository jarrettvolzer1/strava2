import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySession } from "@/lib/simple-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()

    // Try both cookie names
    const sessionToken = cookieStore.get("session")?.value || cookieStore.get("session-token")?.value

    // Try to verify the session
    let user = null
    let verificationError = null

    if (sessionToken) {
      try {
        user = await verifySession(sessionToken)
      } catch (error) {
        verificationError = error instanceof Error ? error.message : "Unknown error"
      }
    }

    return NextResponse.json({
      success: true,
      hasSessionToken: !!sessionToken,
      sessionValid: !!user,
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          }
        : null,
      verificationError,
      cookies: allCookies.map((c) => ({
        name: c.name,
        value: c.name.includes("session") ? "REDACTED" : c.value.substring(0, 10) + "...",
        path: c.path,
        expires: c.expires,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
