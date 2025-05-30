import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getCurrentUser } from "@/lib/auth-utils"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get recent activities for the user
    const activities = await sql`
      SELECT 
        id,
        name,
        type,
        start_date,
        distance,
        moving_time,
        total_elevation_gain
      FROM activities 
      WHERE user_id_auth = ${user.id}
      ORDER BY start_date DESC
      LIMIT 5
    `

    return NextResponse.json({ activities })
  } catch (error) {
    console.error("Error fetching recent activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
