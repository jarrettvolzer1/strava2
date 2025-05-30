import { type NextRequest, NextResponse } from "next/server"
import { countActivitiesByDateRange } from "@/lib/strava-api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate } = body

    console.log("Debug count activities API called with:", { startDate, endDate })

    // Validate inputs
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing startDate or endDate",
          received: { startDate, endDate },
        },
        { status: 400 },
      )
    }

    // Validate date format
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid date format",
          received: { startDate, endDate },
          parsed: { start: start.toString(), end: end.toString() },
        },
        { status: 400 },
      )
    }

    console.log("Calling countActivitiesByDateRange...")

    const count = await countActivitiesByDateRange(startDate, endDate)

    console.log("Count result:", count)

    return NextResponse.json({
      success: true,
      count,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        startTimestamp: Math.floor(start.getTime() / 1000),
        endTimestamp: Math.floor(end.getTime() / 1000),
      },
    })
  } catch (error) {
    console.error("Error in debug count activities API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
