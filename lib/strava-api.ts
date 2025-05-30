import { neon } from "@neondatabase/serverless"
import { getStravaSettings } from "./system-settings"
import { getCurrentUser } from "./auth-utils"

const sql = neon(process.env.DATABASE_URL!)

// Function to get a valid access token, refreshing if necessary
export async function getValidAccessToken() {
  try {
    // Get current user
    const user = await getCurrentUser()

    if (!user?.id) {
      throw new Error("User not authenticated")
    }

    const connection = await sql`
      SELECT * FROM strava_connections 
      WHERE simple_user_id = ${user.id}
      LIMIT 1
    `

    if (connection.length === 0) {
      throw new Error("No Strava connection found. Please connect your Strava account first.")
    }

    const { access_token, expires_at, refresh_token } = connection[0]
    const expiresAtDate = new Date(expires_at)

    console.log("Token check:", {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresAt: expiresAtDate.toISOString(),
      isExpired: expiresAtDate.getTime() < Date.now(),
      willExpireSoon: expiresAtDate.getTime() < Date.now() + 5 * 60 * 1000,
    })

    // Check if token is expired or will expire in the next 5 minutes
    if (expiresAtDate.getTime() < Date.now() + 5 * 60 * 1000) {
      console.log("Token expired or will expire soon, refreshing...")

      // Token is expired or will expire soon, refresh it
      const settings = await getStravaSettings()

      if (!settings.isConfigured) {
        throw new Error("Strava API is not configured. Please set up your API credentials first.")
      }

      console.log("Refreshing token with client ID:", settings.clientId)

      try {
        const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: settings.clientId,
            client_secret: settings.clientSecret,
            refresh_token,
            grant_type: "refresh_token",
          }),
          cache: "no-store",
        })

        console.log("Token refresh response status:", refreshResponse.status)

        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.json().catch(() => ({}))
          console.error("Token refresh failed:", refreshResponse.status, refreshResponse.statusText, errorData)

          // If refresh fails, the connection is invalid - user needs to reconnect
          throw new Error(
            `Token refresh failed (${refreshResponse.status}). Please reconnect your Strava account in Settings.`,
          )
        }

        const tokenData = await refreshResponse.json()
        console.log(
          "Token refreshed successfully, new expires_at:",
          new Date(tokenData.expires_at * 1000).toISOString(),
        )

        // Update the connection with the new tokens
        await sql`
          UPDATE strava_connections
          SET 
            access_token = ${tokenData.access_token},
            refresh_token = ${tokenData.refresh_token},
            expires_at = ${new Date(tokenData.expires_at * 1000)},
            updated_at = ${new Date()}
          WHERE simple_user_id = ${user.id}
        `

        return tokenData.access_token
      } catch (refreshError) {
        console.error("Error during token refresh:", refreshError)
        throw new Error(
          `Token refresh failed: ${refreshError.message}. Please reconnect your Strava account in Settings.`,
        )
      }
    }

    // Token is still valid
    console.log("Using existing valid token")
    return access_token
  } catch (error) {
    console.error("Error getting valid access token:", error)
    throw error
  }
}

// Function to fetch athlete profile
export async function getAthleteProfile() {
  try {
    const accessToken = await getValidAccessToken()

    console.log("Fetching athlete profile...")
    const response = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    })

    console.log("Athlete profile response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Failed to fetch athlete profile:", response.status, response.statusText, errorData)

      if (response.status === 401) {
        throw new Error("Authentication failed. Please reconnect your Strava account in Settings.")
      }

      throw new Error(`Failed to fetch athlete profile: ${response.status} ${response.statusText}`)
    }

    const profile = await response.json()
    console.log("Athlete profile fetched successfully:", {
      id: profile.id,
      name: `${profile.firstname} ${profile.lastname}`,
    })

    return profile
  } catch (error) {
    console.error("Error fetching athlete profile:", error)
    throw error
  }
}

// Function to count activities in a date range without fetching them
export async function countActivitiesByDateRange(startDate: string, endDate: string) {
  try {
    console.log("countActivitiesByDateRange called with:", { startDate, endDate })

    const accessToken = await getValidAccessToken()
    const after = Math.floor(new Date(startDate).getTime() / 1000)
    const before = Math.floor(new Date(endDate).getTime() / 1000)

    console.log(
      `Counting activities between ${new Date(after * 1000).toISOString()} and ${new Date(before * 1000).toISOString()}`,
    )

    // Start with page 1 and count activities
    let totalCount = 0
    let page = 1
    let hasMorePages = true

    while (hasMorePages && page <= 10) {
      // Limit to 10 pages to avoid infinite loops
      console.log(`Fetching page ${page} for counting...`)

      const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=100&page=${page}`
      console.log("Count API URL:", url)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      })

      console.log(`Page ${page} response status:`, response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to count activities:", response.status, response.statusText, errorData)

        if (response.status === 401) {
          throw new Error("Authentication failed. Please reconnect your Strava account in Settings.")
        }

        throw new Error(`Failed to count activities: ${response.status} ${response.statusText}`)
      }

      const activities = await response.json()
      console.log(`Page ${page}: Found ${activities.length} activities`)

      if (activities.length === 0) {
        hasMorePages = false
      } else {
        totalCount += activities.length

        // If we got less than 100 activities, this is the last page
        if (activities.length < 100) {
          hasMorePages = false
        } else {
          page++
        }
      }
    }

    console.log(`Total activities counted: ${totalCount}`)
    return totalCount
  } catch (error) {
    console.error("Error counting activities:", error)
    throw error // Don't fall back to mock data, let the error bubble up
  }
}

// Function to fetch activities by date range
export async function getActivitiesByDateRange(startDate: string, endDate: string) {
  try {
    const accessToken = await getValidAccessToken()
    const after = Math.floor(new Date(startDate).getTime() / 1000)
    const before = Math.floor(new Date(endDate).getTime() / 1000)

    console.log(
      `Fetching activities between ${new Date(after * 1000).toISOString()} and ${new Date(before * 1000).toISOString()}`,
    )

    // Strava API returns activities in reverse chronological order (newest first)
    // and has a default limit of 30 activities per page
    let page = 1
    let allActivities: any[] = []
    let hasMorePages = true

    while (hasMorePages) {
      console.log(`Fetching page ${page} of activities...`)

      const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30&page=${page}`
      console.log("API URL:", url)

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Failed to fetch activities:", response.status, response.statusText, errorData)

          if (response.status === 401) {
            throw new Error("Authentication failed. Please reconnect your Strava account in Settings.")
          }

          throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`)
        }

        const activities = await response.json()
        console.log(`Received ${activities.length} activities on page ${page}`)

        if (activities.length === 0) {
          hasMorePages = false
        } else {
          allActivities = [...allActivities, ...activities]
          page++
        }
      } catch (fetchError) {
        console.error(`Error fetching page ${page}:`, fetchError)
        throw new Error(`Failed to fetch activities page ${page}: ${fetchError.message}`)
      }
    }

    console.log(`Total activities fetched: ${allActivities.length}`)
    return allActivities
  } catch (error) {
    console.error("Error fetching activities:", error)
    throw error
  }
}

// Function to fetch a single activity by ID
export async function getActivityById(activityId: number) {
  try {
    const accessToken = await getValidAccessToken()

    const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Failed to fetch activity:", response.status, response.statusText, errorData)

      if (response.status === 401) {
        throw new Error("Authentication failed. Please reconnect your Strava account in Settings.")
      }

      throw new Error(`Failed to fetch activity: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching activity:", error)
    throw error
  }
}
