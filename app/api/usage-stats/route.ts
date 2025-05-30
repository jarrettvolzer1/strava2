import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // Create usage_stats table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS usage_stats (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        tokens_used INTEGER DEFAULT 0,
        cost DECIMAL(10, 6) DEFAULT 0,
        model VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Get today's stats
    const todayStats = await sql`
      SELECT 
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(*) as sessions_today
      FROM usage_stats 
      WHERE date = CURRENT_DATE
    `

    // Get all-time stats
    const allTimeStats = await sql`
      SELECT 
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(DISTINCT date) as days_used
      FROM usage_stats
    `

    return NextResponse.json({
      today: todayStats[0],
      allTime: allTimeStats[0],
    })
  } catch (error) {
    console.error("Error fetching usage stats:", error)
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tokensUsed, cost, model } = await request.json()

    await sql`
      INSERT INTO usage_stats (tokens_used, cost, model)
      VALUES (${tokensUsed}, ${cost}, ${model})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving usage stats:", error)
    return NextResponse.json({ error: "Failed to save usage stats" }, { status: 500 })
  }
}
