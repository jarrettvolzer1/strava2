"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { getRecentActivities } from "@/lib/actions"
import { MonitorIcon as Running, Bike, FishIcon as Swim, Mountain, FootprintsIcon, Dumbbell } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Activity {
  id: number
  strava_id: number
  name: string
  type: string
  start_date: string
  elapsed_time: number
  distance: number
}

export function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isMockData, setIsMockData] = useState(false)

  const fetchActivities = async () => {
    setIsLoading(true)
    setError(null)
    setIsRetrying(true)
    try {
      // Use a local timeout to prevent UI hanging if server doesn't respond
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const recentActivities = await getRecentActivities()
      clearTimeout(timeoutId)

      // Check if this is likely mock data
      setIsMockData(
        recentActivities.length === 3 && recentActivities[0].id === 1001 && recentActivities[0].name === "Morning Run",
      )

      setActivities(recentActivities)
    } catch (error) {
      console.error("Failed to fetch recent activities:", error)
      setError("Could not load activities. Please try again later.")
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371
    return `${miles.toFixed(2)} mi`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`
  }

  // Activity type icon mapping
  const getActivityIcon = (type: string) => {
    // Normalize the type to lowercase for consistent comparison
    const normalizedType = type.toLowerCase().replace(/[_\s]/g, "")

    switch (normalizedType) {
      case "run":
        return <Running className="h-4 w-4 text-orange-500" />
      case "ride":
        return <Bike className="h-4 w-4 text-blue-500" />
      case "swim":
        return <Swim className="h-4 w-4 text-cyan-500" />
      case "hike":
        return <Mountain className="h-4 w-4 text-green-600" />
      case "walk":
        return <FootprintsIcon className="h-4 w-4 text-emerald-500" />
      case "standuppaddling":
      case "standuppaddle":
      case "sup":
      case "paddleboard":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            className="h-4 w-4 text-cyan-600"
          >
            <path fill="currentColor" d="M10 4 L14 4 L15 8 L15 18 L13 22 L11 22 L9 18 L9 8 Z" />
            <path fill="#8B4513" d="M17 2 L18 4 L19 6 L19 12 L18 14 L17 14 L16 12 L16 6 Z" />
          </svg>
        )
      case "kayaking":
      case "kayak":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            className="h-4 w-4 text-red-500"
          >
            <path fill="currentColor" d="M4 12 L20 12 L18 16 L6 16 Z" />
            <path fill="#8B4513" d="M3 10 L7 12 L7 14 L3 16 Z" />
            <path fill="#8B4513" d="M21 10 L17 12 L17 14 L21 16 Z" />
          </svg>
        )
      default:
        return <Dumbbell className="h-4 w-4 text-purple-500" />
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading recent activities...</p>
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-fit flex items-center gap-1"
            onClick={fetchActivities}
            disabled={isRetrying}
          >
            {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activities found. Import some activities first.</p>
  }

  return (
    <div className="space-y-4">
      {isMockData && (
        <Alert className="bg-amber-50 border-amber-200 mb-4">
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>Showing sample data while database connection is unavailable.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActivities}
              disabled={isRetrying}
              className="h-7 gap-1 text-xs"
            >
              {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/activities/${activity.id}`}
                className="font-medium hover:text-orange-600 hover:underline transition-colors"
              >
                {activity.name}
              </Link>
              <Badge variant="outline" className="flex items-center gap-1">
                {getActivityIcon(activity.type)}
                <span>{activity.type}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{format(new Date(activity.start_date), "PPP")}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatDistance(activity.distance)}</p>
            <p className="text-sm text-muted-foreground">{formatDuration(activity.elapsed_time)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
