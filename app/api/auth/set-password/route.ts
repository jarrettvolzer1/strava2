import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, setPassword } from "@/lib/simple-auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getSessionUser(sessionToken)
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Get new password from request
    const { newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Set the new password
    const success = await setPassword(user.id, newPassword)

    if (!success) {
      return NextResponse.json({ error: "Failed to set password" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Set password error:", error)
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 })
  }
}
