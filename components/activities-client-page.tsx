"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppWrapper from "@/components/app-wrapper"
import { ActivitiesTable } from "@/components/activities-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

interface Activity {
  id: number
  strava_id: number
  name: string
  type: string
  start_date: string
  elapsed_time: number
  distance: number
  total_elevation_gain: number
  average_speed: number
  map?: any
  polyline?: string
}

export default function ActivitiesClientPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("Session status:", status)
    console.log("Session data:", session)

    if (status === "loading") {
      console.log("Session still loading...")
      return
    }

    if (status === "unauthenticated") {
      console.log("User not authenticated, redirecting to login...")
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user) {
      console.log("User authenticated:", session.user)
      fetchActivities()
    }
  }, [session, status, router])

  async function fetchActivities() {
    try {
      console.log("Fetching activities...")
      const response = await fetch("/api/activities")
      console.log("API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("API error:", errorData)
        throw new Error(`Failed to fetch activities: ${response.status}`)
      }

      const data = await response.json()
      console.log("Activities data:", data)
      setActivities(data.activities || [])
    } catch (err) {
      console.error("Error fetching activities:", err)
      setError(err instanceof Error ? err.message : "Failed to load activities")
      // Use mock data as fallback
      setActivities(getMockActivities())
    } finally {
      setLoading(false)
    }
  }

  // Show loading while session is being determined
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading session...</p>
        </div>
      </div>
    )
  }

  // Show loading while activities are being fetched
  if (loading && status === "authenticated") {
    return (
      <AppWrapper>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
            <p className="text-muted-foreground">View and manage all your Strava activities</p>
          </div>
          <Card>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading activities...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppWrapper>
    )
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (status !== "authenticated") {
    return null
  }

  return (
    <AppWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground">View and manage all your Strava activities</p>
          {session?.user && (
            <p className="text-sm text-muted-foreground mt-1">
              Logged in as: {session.user.email} ({session.user.role})
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-2">
                Showing sample data instead. You can try refreshing the page to reconnect to the database.
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Activities</CardTitle>
            <CardDescription>
              {activities.length === 0
                ? "No activities found. Connect your Strava account to import activities."
                : `Browse through all ${activities.length} imported activities`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivitiesTable activities={activities} />
          </CardContent>
        </Card>
      </div>
    </AppWrapper>
  )
}

// Mock data function for fallback
function getMockActivities(): Activity[] {
  const activities = []
  const types = ["Run", "Ride", "Swim", "Hike", "Walk", "StandUp Paddling", "Kayaking"]

  for (let i = 0; i < 20; i++) {
    const daysAgo = i * 2
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
                  : 7000 + Math.random() * 5000

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
    })
  }

  return activities
}
