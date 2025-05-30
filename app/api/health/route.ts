import { NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { getCurrentUser } from "@/lib/auth-utils"

export async function GET() {
  try {
    // Basic health check - no sensitive data
    const dbCheck = await sql`SELECT 1 as health`

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbCheck.length > 0 ? "connected" : "disconnected",
      version: "1.0.0",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      { status: 503 },
    )
  }
}

// Admin-only detailed health check
export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Detailed health check for admins
    const dbCheck = await sql`SELECT COUNT(*) as user_count FROM users`
    const settingsCheck = await sql`SELECT COUNT(*) as settings_count FROM system_settings`

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      users: dbCheck[0]?.user_count || 0,
      settings: settingsCheck[0]?.settings_count || 0,
      environment: process.env.NODE_ENV,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Database connection failed",
      },
      { status: 503 },
    )
  }
}
