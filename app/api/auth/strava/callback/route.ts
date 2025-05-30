import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getStravaSettings } from "@/lib/system-settings"
import { cookies } from "next/headers"
import { verifySession } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const scope = searchParams.get("scope") || "read,activity:read_all"

  console.log("Strava OAuth callback received:", {
    code: code ? "present" : "missing",
    error,
    scope,
    fullUrl: request.url,
  })

  // Handle OAuth errors
  if (error || !code) {
    console.error("OAuth authorization error:", error)
    const errorDetails = {
      error,
      description: error === "access_denied" ? "User denied access" : "Authorization failed",
      timestamp: new Date().toISOString(),
    }
    return NextResponse.redirect(
      new URL(
        `/settings?tab=user&error=oauth_error&details=${encodeURIComponent(JSON.stringify(errorDetails))}`,
        request.url,
      ),
    )
  }

  try {
    // Verify user session
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      console.error("No session token found")
      return NextResponse.redirect(new URL("/login?error=session_expired&redirect=/settings", request.url))
    }

    const user = await verifySession(sessionToken)
    if (!user) {
      console.error("Invalid session")
      return NextResponse.redirect(new URL("/login?error=invalid_session&redirect=/settings", request.url))
    }

    console.log("User authenticated:", user.username, "ID:", user.id)

    // Get Strava API settings
    const settings = await getStravaSettings()
    if (!settings.isConfigured) {
      console.error("Strava API not configured")
      const errorDetails = {
        error: "api_not_configured",
        description: "Strava API credentials are not configured",
        timestamp: new Date().toISOString(),
      }
      return NextResponse.redirect(
        new URL(
          `/settings?tab=user&error=config_error&details=${encodeURIComponent(JSON.stringify(errorDetails))}`,
          request.url,
        ),
      )
    }

    // Exchange authorization code for access token
    console.log("Exchanging code for tokens...")
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    })

    const responseText = await tokenResponse.text()
    console.log("Token exchange response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        errorData = { rawResponse: responseText }
      }

      console.error("Token exchange failed:", errorData)
      const errorDetails = {
        error: "token_exchange_failed",
        description: "Failed to exchange authorization code for access token",
        status: tokenResponse.status,
        response: errorData,
        timestamp: new Date().toISOString(),
      }
      return NextResponse.redirect(
        new URL(
          `/settings?tab=user&error=token_error&details=${encodeURIComponent(JSON.stringify(errorDetails))}`,
          request.url,
        ),
      )
    }

    const tokenData = JSON.parse(responseText)
    console.log("Token exchange successful. Athlete ID:", tokenData.athlete?.id)

    if (!tokenData.athlete?.id) {
      console.error("No athlete data in token response")
      const errorDetails = {
        error: "missing_athlete_data",
        description: "Strava response missing athlete information",
        response: tokenData,
        timestamp: new Date().toISOString(),
      }
      return NextResponse.redirect(
        new URL(
          `/settings?tab=user&error=data_error&details=${encodeURIComponent(JSON.stringify(errorDetails))}`,
          request.url,
        ),
      )
    }

    // Store or update the connection
    const connectionData = {
      simple_user_id: user.id,
      athlete_id: tokenData.athlete.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(tokenData.expires_at * 1000),
      scope: tokenData.scope || scope,
    }

    console.log("Storing connection for user:", user.id)

    await sql`
      INSERT INTO strava_connections (
        simple_user_id,
        athlete_id,
        access_token,
        refresh_token,
        expires_at,
        scope,
        created_at,
        updated_at
      )
      VALUES (
        ${connectionData.simple_user_id},
        ${connectionData.athlete_id},
        ${connectionData.access_token},
        ${connectionData.refresh_token},
        ${connectionData.expires_at},
        ${connectionData.scope},
        NOW(),
        NOW()
      )
      ON CONFLICT (simple_user_id) 
      DO UPDATE SET
        athlete_id = EXCLUDED.athlete_id,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        scope = EXCLUDED.scope,
        updated_at = NOW()
    `

    console.log("Strava connection stored successfully")

    // Redirect to success page
    return NextResponse.redirect(new URL("/settings?tab=user&success=connected", request.url))
  } catch (error) {
    console.error("OAuth callback error:", error)
    const errorDetails = {
      error: "server_error",
      description: "Internal server error during OAuth callback",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }
    return NextResponse.redirect(
      new URL(
        `/settings?tab=user&error=server_error&details=${encodeURIComponent(JSON.stringify(errorDetails))}`,
        request.url,
      ),
    )
  }
}
