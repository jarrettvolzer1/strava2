import { type NextRequest, NextResponse } from "next/server"
import { setSystemSetting, getSystemSetting } from "@/lib/system-settings"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const appUrl = body.appUrl || "https://v0-strava-analyer.vercel.app"

    // Validate the URL format
    try {
      new URL(appUrl)
    } catch (urlError) {
      return NextResponse.json({ success: false, error: "Invalid URL format" }, { status: 400 })
    }

    // Set the APP_URL
    const success = await setSystemSetting("APP_URL", appUrl)

    if (!success) {
      return NextResponse.json({ success: false, error: "Failed to update APP_URL in database" }, { status: 500 })
    }

    // Verify it was set
    const savedUrl = await getSystemSetting("APP_URL")

    return NextResponse.json({
      success: true,
      message: "APP_URL updated successfully",
      appUrl: savedUrl,
      redirectUri: `${appUrl}/api/auth/strava/callback`,
    })
  } catch (error) {
    console.error("Error updating APP_URL:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Check server logs for more information",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const currentAppUrl = await getSystemSetting("APP_URL")
    const correctAppUrl = "https://v0-strava-analyer.vercel.app"

    return NextResponse.json({
      success: true,
      currentAppUrl,
      correctAppUrl,
      needsUpdate: currentAppUrl !== correctAppUrl,
      redirectUri: `${correctAppUrl}/api/auth/strava/callback`,
    })
  } catch (error) {
    console.error("Error checking APP_URL:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Check server logs for more information",
      },
      { status: 500 },
    )
  }
}
