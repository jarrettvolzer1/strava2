import { neon } from "@neondatabase/serverless"
import { getCurrentUser } from "./auth-utils"

const sql = neon(process.env.DATABASE_URL!)

export interface StravaConnection {
  id: number
  simple_user_id: string
  athlete_id: number
  access_token: string
  refresh_token: string
  expires_at: Date
  scope: string
  created_at: Date
  updated_at: Date
}

export async function getStravaConnection(): Promise<StravaConnection | null> {
  try {
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
    return null
  }
}

export async function deleteStravaConnection(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      console.error("No authenticated user found")
      return false
    }

    await sql`
      DELETE FROM strava_connections 
      WHERE simple_user_id = ${user.id}
    `

    console.log("Strava connection deleted for user:", user.id)
    return true
  } catch (error) {
    console.error("Failed to delete Strava connection:", error)
    return false
  }
}

export async function isTokenExpired(connection: StravaConnection): boolean {
  return new Date() >= new Date(connection.expires_at)
}
