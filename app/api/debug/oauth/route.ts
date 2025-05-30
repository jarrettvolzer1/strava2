import { NextResponse } from "next/server"
import { getStravaSettings } from "@/lib/system-settings"

export async function GET() {
  try {
    const settings = await getStravaSettings()

    // Get the base URL from settings or use a fallback
    const baseUrl = settings.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Ensure the baseUrl doesn't have a trailing slash
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

    // Construct the redirect URI - this MUST match exactly what Strava expects
    const redirectUri = `${normalizedBaseUrl}/api/auth/strava/callback`

    // Generate the authorization URL
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${settings.clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code&scope=read,activity:read_all&approval_prompt=force`

    return NextResponse.json({
      settings: {
        clientId: settings.clientId ? `${settings.clientId.substring(0, 4)}...` : null,
        clientSecret: settings.clientSecret ? "****" : null,
        appUrl: settings.appUrl,
        isConfigured: settings.isConfigured,
      },
      oauth: {
        baseUrl,
        normalizedBaseUrl,
        redirectUri,
        authUrl,
        encodedRedirectUri: encodeURIComponent(redirectUri),
      },
      environment: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NODE_ENV: process.env.NODE_ENV,
      },
      instructions: {
        message: "Copy the redirectUri below and add it to your Strava application settings",
        stravaAppSettings: "https://www.strava.com/settings/api",
        redirectUriToAdd: redirectUri,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
