import { type NextRequest, NextResponse } from "next/server"
import { importActivities } from "@/lib/actions"
import { importActivitiesSchema } from "@/lib/validation"
import { getCurrentUser } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = importActivitiesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.errors }, { status: 400 })
    }

    const { startDate, endDate } = validation.data

    console.log("Import API called with:", { startDate, endDate, userId: user.id })

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 })
    }

    // Check if date range is reasonable (max 1 year)
    const oneYear = 365 * 24 * 60 * 60 * 1000
    if (end.getTime() - start.getTime() > oneYear) {
      return NextResponse.json({ error: "Date range cannot exceed 1 year" }, { status: 400 })
    }

    console.log("Calling importActivities server action...")

    const result = await importActivities({
      startDate,
      endDate,
      onProgress: (status, percent) => {
        console.log(`Import progress: ${percent}% - ${status}`)
      },
    })

    console.log("Import result:", result)

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully imported ${result.count} activities`,
    })
  } catch (error) {
    console.error("Error in import activities API:", error)

    let errorMessage = "Unknown error"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    // Don't expose internal errors to client
    if (errorMessage.includes("database") || errorMessage.includes("SQL")) {
      errorMessage = "Internal server error"
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
