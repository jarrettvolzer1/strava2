import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSessionUser } from "@/lib/simple-auth"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Get user from session
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const user = await getSessionUser(sessionToken)
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Get activities for the authenticated user only
    const activities = await sql`
      SELECT * FROM activities 
      WHERE user_id = ${user.id}
      ORDER BY start_date DESC
    `

    return NextResponse.json({ activities })
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
