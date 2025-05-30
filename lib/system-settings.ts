import { neon } from "@neondatabase/serverless"

// Initialize the database connection with the DATABASE_URL environment variable
const sql = neon(process.env.DATABASE_URL!)

export type SystemSetting = {
  key: string
  value: string
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const result = await sql`
      SELECT value FROM system_settings
      WHERE key = ${key}
      LIMIT 1
    `

    return result.length > 0 ? result[0].value : null
  } catch (error) {
    console.error(`Error getting system setting ${key}:`, error)
    return null
  }
}

export async function setSystemSetting(key: string, value: string): Promise<boolean> {
  try {
    await sql`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (${key}, ${value}, ${new Date()})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${value},
        updated_at = ${new Date()}
    `
    return true
  } catch (error) {
    console.error(`Error setting system setting ${key}:`, error)
    return false
  }
}

export async function getAllSystemSettings(): Promise<SystemSetting[]> {
  try {
    const result = await sql`
      SELECT key, value FROM system_settings
      ORDER BY key
    `
    return result
  } catch (error) {
    console.error("Error getting all system settings:", error)
    return []
  }
}

export async function deleteSystemSetting(key: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM system_settings
      WHERE key = ${key}
    `
    return true
  } catch (error) {
    console.error(`Error deleting system setting ${key}:`, error)
    return false
  }
}

// Update Strava settings helper
export async function updateStravaSettings(settings: {
  clientId?: string
  clientSecret?: string
  webhookVerifyToken?: string
  appUrl?: string
  accessToken?: string
  refreshToken?: string
  isConfigured?: boolean
}) {
  try {
    if (settings.clientId) {
      await setSystemSetting("STRAVA_CLIENT_ID", settings.clientId)
    }
    if (settings.clientSecret) {
      await setSystemSetting("STRAVA_CLIENT_SECRET", settings.clientSecret)
    }
    if (settings.webhookVerifyToken) {
      await setSystemSetting("STRAVA_WEBHOOK_VERIFY_TOKEN", settings.webhookVerifyToken)
    }
    if (settings.appUrl) {
      await setSystemSetting("APP_URL", settings.appUrl)
    }
    if (settings.accessToken) {
      await setSystemSetting("STRAVA_ACCESS_TOKEN", settings.accessToken)
    }
    if (settings.refreshToken) {
      await setSystemSetting("STRAVA_REFRESH_TOKEN", settings.refreshToken)
    }

    return true
  } catch (error) {
    console.error("Error updating Strava settings:", error)
    return false
  }
}

// Strava specific settings
export async function getStravaSettings() {
  try {
    const clientId = await getSystemSetting("STRAVA_CLIENT_ID")
    const clientSecret = await getSystemSetting("STRAVA_CLIENT_SECRET")
    const webhookVerifyToken = await getSystemSetting("STRAVA_WEBHOOK_VERIFY_TOKEN")
    const appUrl = await getSystemSetting("APP_URL")
    const accessToken = await getSystemSetting("STRAVA_ACCESS_TOKEN")
    const refreshToken = await getSystemSetting("STRAVA_REFRESH_TOKEN")

    return {
      clientId,
      clientSecret,
      webhookVerifyToken,
      appUrl,
      accessToken,
      refreshToken,
      isConfigured: !!(clientId && clientSecret && appUrl),
    }
  } catch (error) {
    console.error("Error getting Strava settings:", error)
    return {
      clientId: null,
      clientSecret: null,
      webhookVerifyToken: null,
      appUrl: null,
      accessToken: null,
      refreshToken: null,
      isConfigured: false,
    }
  }
}
