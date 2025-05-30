"use server"

import { getSystemSetting, setSystemSetting } from "@/lib/system-settings"
import { env } from "@/app/env"
import { revalidatePath } from "next/cache"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Constants for Google Photos API
const GOOGLE_PHOTOS_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_PHOTOS_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_PHOTOS_API_URL = "https://photoslibrary.googleapis.com/v1"
const GOOGLE_PHOTOS_SCOPES = ["https://www.googleapis.com/auth/photoslibrary.readonly", "profile", "email"]

// Get Google Photos credentials from environment variables or database
async function getGooglePhotosCredentials() {
  const clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID || (await getSystemSetting("GOOGLE_PHOTOS_CLIENT_ID"))
  const clientSecret =
    process.env.GOOGLE_PHOTOS_CLIENT_SECRET || (await getSystemSetting("GOOGLE_PHOTOS_CLIENT_SECRET"))

  if (!clientId || !clientSecret) {
    throw new Error("Google Photos API credentials are not configured")
  }

  return { clientId, clientSecret }
}

// Get Google Photos settings from database
export async function getGoogleSettings() {
  try {
    const clientId = await getSystemSetting("GOOGLE_PHOTOS_CLIENT_ID")
    const clientSecret = await getSystemSetting("GOOGLE_PHOTOS_CLIENT_SECRET")

    return {
      clientId,
      clientSecret,
      isConfigured: !!(clientId && clientSecret),
    }
  } catch (error) {
    console.error("Error getting Google Photos settings:", error)
    return {
      clientId: null,
      clientSecret: null,
      isConfigured: false,
    }
  }
}

// Save Google Photos settings to database
export async function saveGoogleSettings({
  clientId,
  clientSecret,
}: {
  clientId: string
  clientSecret: string
}) {
  try {
    await setSystemSetting("GOOGLE_PHOTOS_CLIENT_ID", clientId)
    await setSystemSetting("GOOGLE_PHOTOS_CLIENT_SECRET", clientSecret)

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Error saving Google Photos settings:", error)
    throw new Error("Failed to save Google Photos settings")
  }
}

// Get Google Photos connection from database
export async function getGooglePhotosConnection() {
  try {
    const accessToken = await getSystemSetting("GOOGLE_PHOTOS_ACCESS_TOKEN")
    const refreshToken = await getSystemSetting("GOOGLE_PHOTOS_REFRESH_TOKEN")
    const tokenExpiry = await getSystemSetting("GOOGLE_PHOTOS_TOKEN_EXPIRY")
    const userName = await getSystemSetting("GOOGLE_PHOTOS_USER_NAME")
    const connectedAt = await getSystemSetting("GOOGLE_PHOTOS_CONNECTED_AT")

    const isConnected = !!(accessToken && refreshToken)

    return {
      isConnected,
      userName: userName || undefined,
      connectedAt: connectedAt || undefined,
      accessToken: accessToken || undefined,
      refreshToken: refreshToken || undefined,
      tokenExpiry: tokenExpiry ? Number.parseInt(tokenExpiry, 10) : undefined,
    }
  } catch (error) {
    console.error("Error getting Google Photos connection:", error)
    return {
      isConnected: false,
    }
  }
}

// Start Google Photos OAuth flow
export async function connectGooglePhotos() {
  try {
    const { clientId } = await getGooglePhotosCredentials()
    const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15)
    await setSystemSetting("GOOGLE_PHOTOS_AUTH_STATE", state)

    // Build the authorization URL
    const authUrl = new URL(GOOGLE_PHOTOS_AUTH_URL)
    authUrl.searchParams.append("client_id", clientId)
    authUrl.searchParams.append("redirect_uri", redirectUri)
    authUrl.searchParams.append("response_type", "code")
    authUrl.searchParams.append("scope", GOOGLE_PHOTOS_SCOPES.join(" "))
    authUrl.searchParams.append("access_type", "offline")
    authUrl.searchParams.append("prompt", "consent")
    authUrl.searchParams.append("state", state)

    return { url: authUrl.toString() }
  } catch (error) {
    console.error("Error starting Google Photos connection:", error)
    throw new Error("Failed to start Google Photos connection")
  }
}

// Disconnect Google Photos
export async function disconnectGooglePhotos() {
  try {
    // Remove Google Photos tokens from database
    await setSystemSetting("GOOGLE_PHOTOS_ACCESS_TOKEN", "")
    await setSystemSetting("GOOGLE_PHOTOS_REFRESH_TOKEN", "")
    await setSystemSetting("GOOGLE_PHOTOS_TOKEN_EXPIRY", "")
    await setSystemSetting("GOOGLE_PHOTOS_USER_NAME", "")

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Error disconnecting Google Photos:", error)
    throw new Error("Failed to disconnect Google Photos")
  }
}

// Refresh Google Photos access token if needed
async function refreshGooglePhotosTokenIfNeeded() {
  const connection = await getGooglePhotosConnection()

  if (!connection.isConnected || !connection.refreshToken) {
    throw new Error("Not connected to Google Photos")
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const now = Math.floor(Date.now() / 1000)
  const tokenExpiry = connection.tokenExpiry || 0

  if (tokenExpiry > now + 300) {
    // Token is still valid
    return connection.accessToken
  }

  // Token is expired or about to expire, refresh it
  try {
    const { clientId, clientSecret } = await getGooglePhotosCredentials()

    const response = await fetch(GOOGLE_PHOTOS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`)
    }

    const data = await response.json()

    // Save the new access token and expiry
    const newExpiry = Math.floor(Date.now() / 1000) + data.expires_in
    await setSystemSetting("GOOGLE_PHOTOS_ACCESS_TOKEN", data.access_token)
    await setSystemSetting("GOOGLE_PHOTOS_TOKEN_EXPIRY", newExpiry.toString())

    return data.access_token
  } catch (error) {
    console.error("Error refreshing Google Photos token:", error)
    throw new Error("Failed to refresh Google Photos token")
  }
}

// Test Google Photos connection by fetching photos for a date range
export async function testGooglePhotos({ startDate, endDate }: { startDate: string; endDate: string }) {
  try {
    const accessToken = await refreshGooglePhotosTokenIfNeeded()

    // Convert dates to the format required by Google Photos API
    const startDateTime = new Date(startDate).toISOString()
    const endDateTime = new Date(endDate).toISOString()

    // Search for media items in the date range
    const response = await fetch(`${GOOGLE_PHOTOS_API_URL}/mediaItems:search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageSize: 25,
        filters: {
          dateFilter: {
            ranges: [
              {
                startDate: {
                  year: new Date(startDateTime).getFullYear(),
                  month: new Date(startDateTime).getMonth() + 1,
                  day: new Date(startDateTime).getDate(),
                },
                endDate: {
                  year: new Date(endDateTime).getFullYear(),
                  month: new Date(endDateTime).getMonth() + 1,
                  day: new Date(endDateTime).getDate(),
                },
              },
            ],
          },
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract photo information
    const photos =
      data.mediaItems?.map((item: any) => ({
        id: item.id,
        url: `${item.baseUrl}=w200-h200`,
        creationTime: item.mediaMetadata?.creationTime || null,
        width: item.mediaMetadata?.width,
        height: item.mediaMetadata?.height,
      })) || []

    return { photos }
  } catch (error) {
    console.error("Error testing Google Photos:", error)
    throw new Error("Failed to fetch photos from Google Photos")
  }
}

// Create Google Photos database tables if they don't exist
export async function createGooglePhotosTables() {
  try {
    // Create table for storing photo metadata
    await sql`
      CREATE TABLE IF NOT EXISTS google_photos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        photo_id TEXT NOT NULL,
        filename TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        thumbnail_url TEXT,
        full_url TEXT,
        metadata JSONB,
        created_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_google_photos_created_at ON google_photos(created_at)
    `

    return { success: true }
  } catch (error) {
    console.error("Error creating Google Photos tables:", error)
    throw new Error("Failed to create Google Photos database tables")
  }
}
