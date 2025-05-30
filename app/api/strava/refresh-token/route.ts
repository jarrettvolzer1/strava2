import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Mock user ID for demo purposes
const MOCK_USER_ID = 1

export async function POST(request: NextRequest) {
  try {
    // Get the current connection
    const connection = await sql`
      SELECT * FROM strava_connections 
      WHERE user_id = ${MOCK_USER_ID}
      LIMIT 1
    `

    if (connection.length === 0) {
      return NextResponse.json({ error: "No Strava connection found" }, { status: 404 })
    }

    const refreshToken = connection[0].refresh_token

    // Exchange the refresh token for a new access token
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("Token refresh error:", errorData)
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()

    // Update the connection with the new tokens
    await sql`
      UPDATE strava_connections
      SET 
        access_token = ${tokenData.access_token},
        refresh_token = ${tokenData.refresh_token},
        expires_at = ${new Date(tokenData.expires_at * 1000)},
        updated_at = ${new Date()}
      WHERE user_id = ${MOCK_USER_ID}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error refreshing token:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
