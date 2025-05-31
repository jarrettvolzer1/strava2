import { type NextRequest, NextResponse } from "next/server"
import { verifyUser, createSession } from "@/lib/simple-auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    console.log("Login attempt for username:", username)

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 })
    }

    // For first-time login, password might be empty
    const user = await verifyUser(username, password || "")

    if (!user) {
      console.log("Login failed: Invalid credentials for", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("User verified:", user.username, "ID:", user.id)

    const sessionToken = await createSession(user.id)
    console.log("Session created:", sessionToken)

    // Set the session cookie
    const cookieStore = cookies()
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    console.log("Cookie set for user:", user.username)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        password_set: user.password_set,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
