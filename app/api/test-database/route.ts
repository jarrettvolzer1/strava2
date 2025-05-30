import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    console.log("🔍 Testing database connection from Next.js API route...\n")

    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable is not set",
          availableEnvVars: Object.keys(process.env).filter(
            (key) => key.includes("DATABASE") || key.includes("POSTGRES") || key.includes("PG"),
          ),
        },
        { status: 500 },
      )
    }

    // Initialize the database connection
    const sql = neon(process.env.DATABASE_URL)
    console.log("✅ Database client initialized successfully")

    // Test basic connection
    console.log("📡 Testing basic connection...")
    const pingResult = await sql`SELECT NOW() as current_time, version() as db_version`
    console.log("✅ Connection successful!")

    // Check if all required tables exist
    console.log("📋 Checking required tables...")
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'system_settings', 'strava_connections', 'activities', 'import_logs')
      ORDER BY table_name
    `

    const expectedTables = ["users", "system_settings", "strava_connections", "activities", "import_logs"]
    const existingTables = tables.map((t) => t.table_name)

    // Test the demo user
    console.log("👥 Checking demo user...")
    const demoUser = await sql`SELECT * FROM users WHERE id = 1`

    // Test system settings
    console.log("⚙️ Checking system settings...")
    const settings =
      await sql`SELECT key, CASE WHEN value = '' THEN 'empty' ELSE 'set' END as status FROM system_settings ORDER BY key`

    // Test activities table
    console.log("🏃 Testing activities table...")
    const activitiesCount = await sql`SELECT COUNT(*) as count FROM activities`

    // Test a complex query that the app uses
    const statsQuery = await sql`
      SELECT
        COUNT(*) as total_activities,
        COALESCE(SUM(distance), 0) as total_distance,
        COALESCE(SUM(elapsed_time), 0) as total_duration,
        COALESCE(SUM(total_elevation_gain), 0) as total_elevation
      FROM activities
      WHERE user_id = 1
    `

    // Test strava_connections table
    console.log("🔗 Testing strava_connections table...")
    const connectionsCount = await sql`SELECT COUNT(*) as count FROM strava_connections`

    // Test import_logs table
    console.log("📥 Testing import_logs table...")
    const importLogsCount = await sql`SELECT COUNT(*) as count FROM import_logs`

    // Test database permissions
    console.log("🔐 Testing database permissions...")
    await sql`
      INSERT INTO system_settings (key, value) 
      VALUES ('CONNECTION_TEST', 'success')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `

    await sql`UPDATE system_settings SET value = 'updated_success' WHERE key = 'CONNECTION_TEST'`
    const testResult = await sql`SELECT value FROM system_settings WHERE key = 'CONNECTION_TEST'`
    await sql`DELETE FROM system_settings WHERE key = 'CONNECTION_TEST'`

    // Check environment variables
    const envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      STRAVA_CLIENT_ID: !!process.env.STRAVA_CLIENT_ID,
      STRAVA_CLIENT_SECRET: !!process.env.STRAVA_CLIENT_SECRET,
      USE_MOCK_DATA: !!process.env.USE_MOCK_DATA,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    }

    console.log("🎉 Database verification completed successfully!")

    return NextResponse.json({
      success: true,
      message: "Database connection and schema verification completed successfully!",
      results: {
        connection: {
          status: "✅ Connected",
          timestamp: pingResult[0].current_time,
          database_version: pingResult[0].db_version.split(" ").slice(0, 2).join(" "),
        },
        tables: {
          expected: expectedTables,
          existing: existingTables,
          all_present: existingTables.length === expectedTables.length,
        },
        demo_user: {
          exists: demoUser.length > 0,
          data:
            demoUser.length > 0
              ? {
                  id: demoUser[0].id,
                  email: demoUser[0].email,
                  name: demoUser[0].name,
                }
              : null,
        },
        system_settings: {
          count: settings.length,
          settings: settings.reduce((acc, setting) => {
            acc[setting.key] = setting.status
            return acc
          }, {}),
        },
        activities: {
          count: Number.parseInt(activitiesCount[0].count),
          stats: {
            total_activities: Number.parseInt(statsQuery[0].total_activities),
            total_distance: Number.parseFloat(statsQuery[0].total_distance),
            total_duration: Number.parseInt(statsQuery[0].total_duration),
            total_elevation: Number.parseFloat(statsQuery[0].total_elevation),
          },
        },
        strava_connections: {
          count: Number.parseInt(connectionsCount[0].count),
        },
        import_logs: {
          count: Number.parseInt(importLogsCount[0].count),
        },
        permissions: {
          insert: "✅ Working",
          update: "✅ Working",
          select: "✅ Working",
          delete: "✅ Working",
        },
        environment_variables: envVars,
      },
    })
  } catch (error) {
    console.error("💥 Database verification failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        troubleshooting: {
          connection_timeout: error.message.includes("timeout")
            ? [
                "Check if your Neon database is active",
                "Verify network connectivity",
                "Check Neon dashboard for database status",
              ]
            : null,
          authentication_failed:
            error.message.includes("authentication") || error.message.includes("password")
              ? [
                  "Verify DATABASE_URL is correct",
                  "Check Neon dashboard for connection string",
                  "Ensure credentials haven't expired",
                ]
              : null,
          table_missing: error.message.includes("does not exist")
            ? [
                "Run the database schema creation script",
                "Check if you're connecting to the correct database",
                "Verify table names are correct",
              ]
            : null,
        },
      },
      { status: 500 },
    )
  }
}
