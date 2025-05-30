import { neon } from "@neondatabase/serverless"
import { getCurrentUser } from "./auth-utils"

const sql = neon(process.env.DATABASE_URL!)

export async function getStravaConnection() {
  try {
    // Get current user
    const user = await getCurrentUser()

    if (!user?.id) {
      console.error("No authenticated user found")
      return null
    }

    const result = await sql`
      SELECT * FROM strava_connections 
      WHERE simple_user_id = ${user.id}
      LIMIT 1
    `

    console.log("getStravaConnection result:", {
      found: result.length > 0,
      athleteId: result.length > 0 ? result[0].athlete_id : null,
    })

    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error("Failed to get Strava connection:", error)
    // Return an error object instead of null to distinguish between "no connection" and "database error"
    return { error: true, message: error.message }
  }
}
