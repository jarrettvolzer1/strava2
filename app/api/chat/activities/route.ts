import { type NextRequest, NextResponse } from "next/server"
import { getChatGPTSettings } from "@/lib/chatgpt-actions"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Polyline decoder function (from map component)
function decodePolyline(encoded: string) {
  if (!encoded || typeof encoded !== "string") return []

  const points = []
  let index = 0,
    lat = 0,
    lng = 0

  try {
    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlat = result & 1 ? ~(result >> 1) : result >> 1
      lat += dlat

      shift = 0
      result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlng = result & 1 ? ~(result >> 1) : result >> 1
      lng += dlng

      points.push([lat / 1e5, lng / 1e5])
    }
  } catch (error) {
    console.error("Error decoding polyline:", error)
  }

  return points
}

// Helper function to find polyline in an object (from map component)
function findPolyline(obj: any): string | null {
  if (!obj) return null

  // Direct properties
  if (obj.polyline && typeof obj.polyline === "string") return obj.polyline
  if (obj.summary_polyline && typeof obj.summary_polyline === "string") return obj.summary_polyline

  // Check map property
  if (obj.map) {
    if (obj.map.polyline && typeof obj.map.polyline === "string") return obj.map.polyline
    if (obj.map.summary_polyline && typeof obj.map.summary_polyline === "string") return obj.map.summary_polyline
  }

  // For Strava API responses, check for map.summary_polyline
  if (typeof obj === "object") {
    for (const key in obj) {
      if (typeof obj[key] === "object") {
        const result = findPolyline(obj[key])
        if (result) return result
      }
    }
  }

  return null
}

// Helper function to extract coordinates from activity data (from map component)
function extractCoordinates(data: any): { start?: [number, number]; end?: [number, number] } {
  const result: { start?: [number, number]; end?: [number, number] } = {}

  if (!data) return result

  try {
    // Try to find start_latlng and end_latlng in the data
    if (data.start_latlng && Array.isArray(data.start_latlng) && data.start_latlng.length >= 2) {
      result.start = [data.start_latlng[0], data.start_latlng[1]]
    }

    if (data.end_latlng && Array.isArray(data.end_latlng) && data.end_latlng.length >= 2) {
      result.end = [data.end_latlng[0], data.end_latlng[1]]
    }

    // If not found directly, try to find them in nested objects
    if ((!result.start || !result.end) && typeof data === "object") {
      for (const key in data) {
        if (typeof data[key] === "object") {
          if (
            !result.start &&
            data[key]?.start_latlng &&
            Array.isArray(data[key].start_latlng) &&
            data[key].start_latlng.length >= 2
          ) {
            result.start = [data[key].start_latlng[0], data[key].start_latlng[1]]
          }

          if (
            !result.end &&
            data[key]?.end_latlng &&
            Array.isArray(data[key].end_latlng) &&
            data[key].end_latlng.length >= 2
          ) {
            result.end = [data[key].end_latlng[0], data[key].end_latlng[1]]
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting coordinates:", error)
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    // Check if ChatGPT is configured
    const settings = await getChatGPTSettings()
    if (!settings.isConfigured) {
      return NextResponse.json(
        { error: "ChatGPT API is not configured. Please set up your API key in settings." },
        { status: 400 },
      )
    }

    // Debug mode for location data
    if (message.toLowerCase().trim() === "debug location") {
      const activityData = await fetchUserActivityData()
      return NextResponse.json({
        response: `DEBUG MODE - Location Data Analysis:

RAW ACTIVITY DATA BEING SENT TO AI:
${activityData}

SOLUTION IMPLEMENTED:
1. Now using polyline decoding to extract start coordinates
2. Fetching ALL activities (not just recent ones)
3. Look for [Start: XX.XXXXXX, -XX.XXXXXX] coordinates in the activity data above`,
        tokensUsed: 0,
      })
    }

    // Fetch user's activity data for context
    const activityData = await fetchUserActivityData()

    // Prepare the conversation context
    const systemPrompt = `You are an AI training assistant helping an athlete analyze their Strava activities. You have access to their activity data and should provide helpful, encouraging, and data-driven insights.

AVAILABLE ACTIVITY DATA:
${activityData}

Guidelines:
- Be conversational and encouraging
- Provide specific data when available
- Offer actionable training advice
- If asked about data you don't have, explain what data is available
- Keep responses concise but informative
- Use English units (miles, feet, mph) in your responses`

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ]

    // Make request to OpenAI
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    }

    if (settings.organizationId) {
      headers["OpenAI-Organization"] = settings.organizationId
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.model || "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to get AI response")
    }

    const data = await response.json()

    // Calculate cost based on model
    const inputTokens = data.usage?.prompt_tokens || 0
    const outputTokens = data.usage?.completion_tokens || 0
    const totalTokens = data.usage?.total_tokens || 0

    let cost = 0
    const model = settings.model || "gpt-4o-mini"
    if (model === "gpt-4o-mini") {
      cost = (inputTokens * 0.00015) / 1000 + (outputTokens * 0.0006) / 1000
    } else if (model === "gpt-4o") {
      cost = (inputTokens * 0.0025) / 1000 + (outputTokens * 0.01) / 1000
    } else if (model === "gpt-4-turbo") {
      cost = (inputTokens * 0.01) / 1000 + (outputTokens * 0.03) / 1000
    }

    return NextResponse.json({
      response: data.choices[0].message.content,
      tokensUsed: totalTokens,
      inputTokens,
      outputTokens,
      cost: cost.toFixed(6),
      model,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      { status: 500 },
    )
  }
}

async function fetchUserActivityData() {
  try {
    // Get ALL activities with location data (not just recent ones)
    const allActivities = await sql`
      SELECT 
        name,
        type,
        distance,
        elapsed_time,
        total_elevation_gain,
        average_speed,
        max_speed,
        start_date,
        raw_data,
        map_data,
        start_latlng as db_start_latlng,
        end_latlng as db_end_latlng
      FROM activities 
      ORDER BY start_date DESC
    `

    // Get overall stats
    const stats = await sql`
      SELECT 
        COUNT(*) as total_activities,
        SUM(distance) as total_distance,
        SUM(elapsed_time) as total_time,
        SUM(total_elevation_gain) as total_elevation,
        AVG(average_speed) as avg_speed
      FROM activities
    `

    // Get activity type breakdown
    const typeBreakdown = await sql`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(distance) as total_distance,
        AVG(average_speed) as avg_speed
      FROM activities 
      GROUP BY type 
      ORDER BY count DESC
    `

    // Format the data for the AI with location information
    const activitiesSummary = allActivities
      .map((a: any, index: number) => {
        const distanceMiles = (a.distance * 0.000621371).toFixed(1)
        const durationMin = Math.round(a.elapsed_time / 60)
        const speedMph = (a.average_speed * 2.23694).toFixed(1)
        const elevationFt = Math.round(a.total_elevation_gain * 3.28084)
        const date = new Date(a.start_date).toLocaleDateString()

        // Extract start coordinates using polyline decoding
        let locationInfo = ""
        let debugInfo = ""

        try {
          // First, try the database columns for direct coordinates
          if (a.db_start_latlng) {
            const dbCoords = typeof a.db_start_latlng === "string" ? JSON.parse(a.db_start_latlng) : a.db_start_latlng
            if (Array.isArray(dbCoords) && dbCoords.length >= 2 && dbCoords[0] !== 0 && dbCoords[1] !== 0) {
              locationInfo = ` [Start: ${dbCoords[0].toFixed(6)}, ${dbCoords[1].toFixed(6)}]`
              debugInfo = ` [SOURCE: db_column]`
            }
          }

          // If no database coordinates, try extracting from raw_data coordinates
          if (!locationInfo && a.raw_data) {
            const rawData = typeof a.raw_data === "string" ? JSON.parse(a.raw_data) : a.raw_data
            const coordinates = extractCoordinates(rawData)
            if (coordinates.start && coordinates.start[0] !== 0 && coordinates.start[1] !== 0) {
              locationInfo = ` [Start: ${coordinates.start[0].toFixed(6)}, ${coordinates.start[1].toFixed(6)}]`
              debugInfo = ` [SOURCE: raw_coords]`
            }
          }

          // If still no coordinates, try decoding polylines from raw_data
          if (!locationInfo && a.raw_data) {
            const rawData = typeof a.raw_data === "string" ? JSON.parse(a.raw_data) : a.raw_data
            const polylineData = findPolyline(rawData)
            if (polylineData) {
              const polylineCoords = decodePolyline(polylineData)
              if (polylineCoords.length > 0) {
                const startPoint = polylineCoords[0]
                locationInfo = ` [Start: ${startPoint[0].toFixed(6)}, ${startPoint[1].toFixed(6)}]`
                debugInfo = ` [SOURCE: raw_polyline]`
              }
            }
          }

          // If still no coordinates, try decoding polylines from map_data
          if (!locationInfo && a.map_data) {
            const mapData = typeof a.map_data === "string" ? JSON.parse(a.map_data) : a.map_data
            const polylineData = findPolyline(mapData)
            if (polylineData) {
              const polylineCoords = decodePolyline(polylineData)
              if (polylineCoords.length > 0) {
                const startPoint = polylineCoords[0]
                locationInfo = ` [Start: ${startPoint[0].toFixed(6)}, ${startPoint[1].toFixed(6)}]`
                debugInfo = ` [SOURCE: map_polyline]`
              }
            }
          }

          if (!locationInfo) {
            debugInfo = ` [NO_COORDS: no valid polyline or coordinates found]`
          }
        } catch (error) {
          debugInfo = ` [ERROR: ${error.message}]`
        }

        return `${a.type}: ${a.name} - ${distanceMiles}mi in ${durationMin}min (${speedMph}mph, ${elevationFt}ft gain) on ${date}${locationInfo}`
      })
      .join("\n")

    const overallStats = stats[0]
    const totalDistanceMiles = (overallStats.total_distance * 0.000621371).toFixed(0)
    const totalHours = Math.round(overallStats.total_time / 3600)
    const avgSpeedMph = (overallStats.avg_speed * 2.23694).toFixed(1)
    const totalElevationFt = Math.round(overallStats.total_elevation * 3.28084)

    const typesSummary = typeBreakdown
      .map((t: any) => {
        const distanceMiles = (t.total_distance * 0.000621371).toFixed(0)
        const speedMph = (t.avg_speed * 2.23694).toFixed(1)
        return `${t.type}: ${t.count} activities, ${distanceMiles}mi total, avg ${speedMph}mph`
      })
      .join("\n")

    // Limit the number of activities sent to the AI to avoid token limits
    const maxActivitiesToSend = 50
    const activitiesForAI =
      allActivities.length > maxActivitiesToSend
        ? `${activitiesSummary.split("\n").slice(0, maxActivitiesToSend).join("\n")}\n... and ${allActivities.length - maxActivitiesToSend} more activities (not shown due to space constraints)`
        : activitiesSummary

    return `
ALL ACTIVITIES (${allActivities.length} total):
${activitiesForAI}

OVERALL STATISTICS:
- Total Activities: ${overallStats.total_activities}
- Total Distance: ${totalDistanceMiles}mi
- Total Time: ${totalHours} hours
- Average Speed: ${avgSpeedMph}mph
- Total Elevation: ${totalElevationFt}ft

ACTIVITY TYPE BREAKDOWN:
${typesSummary}

LOCATION DATA FORMAT:
Coordinates are provided as [latitude, longitude] for activity start locations. You can use these coordinates to determine geographic locations, states, cities, and regions to answer location-based questions.
`
  } catch (error) {
    console.error("Error fetching activity data:", error)
    return "Activity data is currently unavailable."
  }
}
