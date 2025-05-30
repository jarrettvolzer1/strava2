import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Get system statistics
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM simple_users) as total_users,
        (SELECT COUNT(*) FROM simple_users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM activities) as total_activities,
        (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active') as active_subscriptions
    `

    const usersByPlan = await sql`
      SELECT 
        sp.name as plan_name,
        sp.plan_type,
        COUNT(us.id) as user_count
      FROM subscription_plans sp
      LEFT JOIN user_subscriptions us ON sp.id = us.plan_id AND us.status = 'active'
      GROUP BY sp.id, sp.name, sp.plan_type
      ORDER BY sp.id
    `

    return NextResponse.json({ stats, usersByPlan })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 })
  }
}
