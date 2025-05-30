import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSystemSetting } from "@/lib/system-settings"

const sql = neon(process.env.DATABASE_URL!)

// Handle Strava webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Get webhook verify token from database
  const webhookVerifyToken = await getSystemSetting("STRAVA_WEBHOOK_VERIFY_TOKEN")

  // Verify the webhook subscription
  if (mode === "subscribe" && token === webhookVerifyToken) {
    return NextResponse.json({ "hub.challenge": challenge })
  } else {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 })
  }
}

// Handle Strava webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the webhook event
    console.log("Received Strava webhook event:", body)

    // Process different event types
    // For example, if a new activity is created, you might want to import it

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
