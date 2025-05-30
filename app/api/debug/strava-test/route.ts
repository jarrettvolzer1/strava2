import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { getStravaConnection } from "@/lib/strava-connection"
import { getStravaSettings } from "@/lib/system-settings"
import { cookies } from "next/headers"
import { verifySession } from "@/lib/simple-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("=== Strava Debug Test Started ===")

    // Check user authentication - with detailed logging
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session-token")?.value
    console.log("Session token exists:", !!sessionToken)

    let user = null

    if (sessionToken) {
      try {
        user = await verifySession(sessionToken)
        console.log("Session verification result:", user ? `Valid for user: ${user.username}` : "Invalid session")
      } catch (error) {
        console.error("Session verification error:", error)
      }
    }

    if (!user) {
      // Try direct getCurrentUser as fallback
      try {
        user = await getCurrentUser()
        console.log("getCurrentUser result:", user ? `Found user: ${user.username}` : "No user found")
      } catch (error) {
        console.error("getCurrentUser error:", error)
      }
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not authenticated",
        step: "authentication",
        details: {
          hasSessionToken: !!sessionToken,
          cookieNames: Array.from(cookieStore.getAll()).map((c) => c.name),
        },
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
