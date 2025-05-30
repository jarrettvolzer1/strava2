import { neon } from "@neondatabase/serverless"
import { executeSqlWithFallback } from "./actions"

const sql = neon(process.env.DATABASE_URL!)

// Mock user ID for demo purposes
const MOCK_USER_ID = 1

export async function getActivities() {
  try {
    // Use the helper function with retries
    const activities = await executeSqlWithFallback(
      sql`
        SELECT * FROM activities 
        WHERE user_id = ${MOCK_USER_ID}
        ORDER BY start_date DESC
      `,
      getMockActivities(),
      { timeoutMs: 15000, retries: 2 },
    )

    return activities
  } catch (error) {
    console.error("Failed to get activities:", error)
    return getMockActivities()
  }
}

// Helper function to generate mock activities for the activities page
function getMockActivities() {
  // Generate 20 mock activities with different types and dates
  const activities = []
  const types = ["Run", "Ride", "Swim", "Hike", "Walk", "StandUp Paddling", "Kayaking"]

  for (let i = 0; i < 20; i++) {
    const daysAgo = i * 2 // Every 2 days
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    const type = types[i % types.length]
    const distance =
      type === "Run"
        ? 5000 + Math.random() * 5000
        : type === "Ride"
          ? 20000 + Math.random() * 30000
          : type === "Swim"
            ? 1000 + Math.random() * 1000
            : type === "Hike"
              ? 8000 + Math.random() * 7000
              : type === "Walk"
                ? 3000 + Math.random() * 2000
                : type === "StandUp Paddling"
                  ? 5000 + Math.random() * 3000
                  : 7000 + Math.random() * 5000 // Kayaking

    const elapsed_time = Math.floor(
      distance /
        (type === "Run"
          ? 3.5
          : type === "Ride"
            ? 8
            : type === "Swim"
              ? 1.2
              : type === "Hike"
                ? 1.2
                : type === "Walk"
                  ? 1.5
                  : type === "StandUp Paddling"
                    ? 2
                    : 2.5),
    )

    activities.push({
      id: 10000 + i,
      strava_id: 10000 + i,
      name: `${type} ${i + 1}`,
      type,
      start_date: date.toISOString(),
      elapsed_time,
      distance,
      total_elevation_gain: Math.random() * 500,
      average_speed: distance / elapsed_time,
      max_speed: (distance / elapsed_time) * (1 + Math.random() * 0.5),
      user_id: MOCK_USER_ID,
      // Add other fields that might be needed
      polyline: null,
      map_data: null,
      raw_data: null,
    })
  }

  return activities
}
