import { NextResponse } from "next/server"
import { verifyUser } from "@/lib/simple-auth"

export async function GET() {
  try {
    // Test the admin login
    const username = "admin"
    const password = "admin123"

    const user = await verifyUser(username, password)

    if (user) {
      return NextResponse.json({
        success: true,
        message: "Authentication successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "Authentication failed",
      })
    }
  } catch (error) {
    console.error("Auth test error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error testing authentication",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
