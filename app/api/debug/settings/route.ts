import { NextResponse } from "next/server"
import { getStravaSettings } from "@/lib/system-settings"

export async function GET() {
  try {
    const settings = await getStravaSettings()

    // Mask sensitive information
    const maskedSettings = {
      clientId: settings.clientId ? `${settings.clientId.substring(0, 2)}...` : null,
      clientSecret: settings.clientSecret ? "****" : null,
      webhookVerifyToken: settings.webhookVerifyToken ? "****" : null,
      appUrl: settings.appUrl,
      isConfigured: settings.isConfigured,
    }

    return NextResponse.json({
      settings: maskedSettings,
      redirectUri: settings.appUrl ? `${settings.appUrl.replace(/\/$/, "")}/api/auth/strava/callback` : null,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
