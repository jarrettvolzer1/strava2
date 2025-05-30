import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getStravaSettings } from "@/lib/system-settings"
import { cookies } from "next/headers"
import { verifySession } from "@/lib/simple-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  // Get the authorization code from the URL query parameters
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const scope = searchParams.get("scope") || "read,activity:read_all"

  console.log("Strava callback received with params:", {
    code: searchParams.get("code") ? "present" : "missing",
    error: searchParams.get("error"),
    scope: searchParams.get("scope"),
    state: searchParams.get("state"),
    fullUrl: request.url,
  })

  // Handle error or denial
  if (error || !code) {
    console.error("Authorization error:", error)
    return NextResponse.redirect(new URL("/settings?tab=user&error=access_denied", request.url))
  }

  try {
    // Get user from session cookie
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      console.error("No session token found in callback")
      return NextResponse.redirect(new URL("/login?error=session_expired&redirect=/settings", request.url))
    }

    const user = await verifySession(sessionToken)
    if (!user) {
      console.error("Invalid session in callback")
      return NextResponse.redirect(new URL("/login?error=invalid_session&redirect=/settings", request.url))
    }

    console.log("User authenticated in callback:", user.username)

    // Get Strava settings from database
    const settings = await getStravaSettings()

    if (!settings.isConfigured) {
      console.error("Strava API not configured")
      return NextResponse.redirect(new URL("/settings?tab=user&error=not_configured", request.url))
    }

    // Exchange the authorization code for an access token
    const tokenRequestBody = {
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      code,
      grant_type: "authorization_code",
    }

    console.log("Exchanging authorization code for access token...")

    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(tokenRequestBody),
    })

    const responseText = await tokenResponse.text()
    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        errorData = { rawText: responseText }
      }

      console.error("Token exchange error:", {
        status: tokenResponse.status,
        errorData,
      })

      return NextResponse.redirect(
        new URL(
          `/settings?tab=user&error=token_exchange&details=${encodeURIComponent(
            JSON.stringify({
              status: tokenResponse.status,
              error: errorData,
            }),
          )}`,
          request.url,
        ),
      )
    }

    const tokenData = JSON.parse(responseText)
    console.log("Token exchange successful, athlete ID:", tokenData.athlete?.id)

    const userId = user.id

    // Check if a connection already exists for this user
    const existingConnection = await sql`
      SELECT * FROM strava_connections 
      WHERE simple_user_id = ${userId}
      LIMIT 1
    `

    const tokenScope = tokenData.scope || scope || "read,activity:read_all"

    if (existingConnection.length > 0) {
      // Update existing connection
      await sql`
        UPDATE strava_connections
        SET 
          athlete_id = ${tokenData.athlete.id},
          access_token = ${tokenData.access_token},
          refresh_token = ${tokenData.refresh_token},
          expires_at = ${new Date(tokenData.expires_at * 1000)},
          scope = ${tokenScope},
          updated_at = NOW()
        WHERE simple_user_id = ${userId}
      `
      console.log("Updated existing Strava connection for user:", userId)
    } else {
      // Create a new connection using INSERT ... ON CONFLICT to handle race conditions
      await sql`
        INSERT INTO strava_connections (
          user_id, 
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
          1,
          ${userId},
          ${tokenData.athlete.id},
          ${tokenData.access_token},
          ${tokenData.refresh_token},
          ${new Date(tokenData.expires_at * 1000)},
          ${tokenScope},
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
      console.log("Created/updated Strava connection for user:", userId)
    }

    // Redirect back to the settings page with success
    return NextResponse.redirect(new URL("/settings?tab=user&success=true", request.url))
  } catch (error) {
    console.error("Error during OAuth callback:", error)
    return NextResponse.redirect(
      new URL(
        `/settings?tab=user&error=server_error&details=${encodeURIComponent(
          JSON.stringify({ message: error instanceof Error ? error.message : "Unknown error" }),
        )}`,
        request.url,
      ),
    )
  }
}
