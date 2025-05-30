import { type NextRequest, NextResponse } from "next/server"
import { setSystemSetting } from "@/lib/system-settings"
import { verifySession } from "@/lib/simple-auth"

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const sessionToken = request.cookies.get("session")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await verifySession(sessionToken)
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, clientSecret, webhookVerifyToken, appUrl, accessToken, refreshToken } = body

    console.log("Saving Strava settings:", { clientId, clientSecret, appUrl, accessToken: accessToken ? "***" : null })

    // Save required settings
    if (clientId) {
      await setSystemSetting("STRAVA_CLIENT_ID", clientId)
    }
    if (clientSecret) {
      await setSystemSetting("STRAVA_CLIENT_SECRET", clientSecret)
    }
    if (appUrl) {
      await setSystemSetting("APP_URL", appUrl)
    }
    if (webhookVerifyToken) {
      await setSystemSetting("STRAVA_WEBHOOK_VERIFY_TOKEN", webhookVerifyToken)
    }

    // Save optional tokens if provided
    if (accessToken) {
      await setSystemSetting("STRAVA_ACCESS_TOKEN", accessToken)
    }
    if (refreshToken) {
      await setSystemSetting("STRAVA_REFRESH_TOKEN", refreshToken)
    }

    console.log("Strava settings saved successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving Strava settings:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save settings" },
      { status: 500 },
    )
  }
}
