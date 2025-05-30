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

    // Get activity stats for the user
    const stats = await sql`
      SELECT 
        COUNT(*) as total_activities,
        SUM(distance) as total_distance,
        SUM(moving_time) as total_time,
        AVG(distance) as avg_distance
      FROM activities 
      WHERE user_id_auth = ${user.id}
    `

    const result = stats[0] || {
      total_activities: 0,
      total_distance: 0,
      total_time: 0,
      avg_distance: 0,
    }

    return NextResponse.json({
      totalActivities: Number.parseInt(result.total_activities) || 0,
      totalDistance: Number.parseFloat(result.total_distance) || 0,
      totalTime: Number.parseInt(result.total_time) || 0,
      avgDistance: Number.parseFloat(result.avg_distance) || 0,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
