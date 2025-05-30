import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, changePassword } from "@/lib/simple-auth"
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

    // Get current and new password from request
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password required" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 })
    }

    // Change the password
    const success = await changePassword(user.id, currentPassword, newPassword)

    if (!success) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
