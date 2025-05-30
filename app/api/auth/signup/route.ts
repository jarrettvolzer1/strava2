import { type NextRequest, NextResponse } from "next/server"
import { createUser, createSession } from "@/lib/simple-auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const userId = await createUser(username, email, password)
    const sessionToken = await createSession(userId)

    const cookieStore = await cookies()
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        email,
        role: "user",
      },
    })
  } catch (error: any) {
    console.error("Signup error:", error)

    if (error.message?.includes("duplicate key")) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  }
}
