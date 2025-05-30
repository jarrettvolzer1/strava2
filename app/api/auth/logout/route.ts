import { type NextRequest, NextResponse } from "next/server"
import { deleteSession } from "@/lib/simple-auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (sessionToken) {
      await deleteSession(sessionToken)
      cookieStore.delete("session")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
