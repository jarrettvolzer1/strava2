import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { getStravaConnection } from "@/lib/strava-connection"
import { getStravaSettings } from "@/lib/system-settings"

export async function GET() {
  try {
    console.log("=== Strava Debug Test Started ===")

    // Check user authentication
    const user = await getCurrentUser()
    console.log("User check:", user ? `Found user: ${user.username} (${user.id})` : "No user found")

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not authenticated",
        step: "authentication",
      })
    }

    // Check Strava settings
    const settings = await getStravaSettings()
    console.log("Strava settings:", {
      isConfigured: settings.isConfigured,
      hasClientId: !!settings.clientId,
      hasClientSecret: !!settings.clientSecret,
      hasAppUrl: !!settings.appUrl,
    })

    if (!settings.isConfigured) {
      return NextResponse.json({
        success: false,
        error: "Strava API not configured",
        step: "settings",
        details: settings,
      })
    }

    // Check database connection
    const connection = await getStravaConnection()
    console.log(
      "Database connection:",
      connection
        ? {
            athleteId: connection.athlete_id,
            hasAccessToken: !!connection.access_token,
            hasRefreshToken: !!connection.refresh_token,
            expiresAt: connection.expires_at,
            isExpired: new Date() >= new Date(connection.expires_at),
            scope: connection.scope,
          }
        : "No connection found",
    )

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: "No Strava connection found in database",
        step: "database_connection",
      })
    }

    // Test Strava API call
    console.log("Testing Strava API call...")
    const response = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        Accept: "application/json",
      },
    })

    console.log("Strava API response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Strava API error:", errorText)

      return NextResponse.json({
        success: false,
        error: "Strava API call failed",
        step: "api_call",
        details: {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        },
      })
    }

    const profile = await response.json()
    console.log("Strava API success:", {
      athleteId: profile.id,
      name: `${profile.firstname} ${profile.lastname}`,
    })

    console.log("=== Strava Debug Test Completed Successfully ===")

    return NextResponse.json({
      success: true,
      profile,
      connection: {
        athleteId: connection.athlete_id,
        expiresAt: connection.expires_at,
        scope: connection.scope,
      },
      settings: {
        hasClientId: !!settings.clientId,
        hasClientSecret: !!settings.clientSecret,
        appUrl: settings.appUrl,
      },
    })
  } catch (error) {
    console.error("=== Strava Debug Test Failed ===", error)

    return NextResponse.json({
      success: false,
      error: "Debug test failed",
      step: "exception",
      details: {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      },
    })
  }
}
