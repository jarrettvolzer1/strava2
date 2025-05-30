import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
  ArrowLeft,
  ExternalLink,
  MonitorIcon as Running,
  Bike,
  FishIcon as Swim,
  Mountain,
  FootprintsIcon,
  Dumbbell,
} from "lucide-react"
import Link from "next/link"
import { neon } from "@neondatabase/serverless"
import { notFound } from "next/navigation"
import { ActivityMap } from "@/components/activity-map"
import { ActivityPhotos } from "@/components/activity-photos"
import { ActivityAIAnalysis } from "@/components/activity-ai-analysis"

const sql = neon(process.env.DATABASE_URL!)

// Mock user ID for demo purposes
const MOCK_USER_ID = 1

async function getActivity(id: number) {
  try {
    // Get more detailed data for debugging
    const result = await sql`
      SELECT *, 
             start_latlng::text as start_latlng_text, 
             end_latlng::text as end_latlng_text
      FROM activities
      WHERE id = ${id} AND user_id = ${MOCK_USER_ID}
      LIMIT 1
    `

    if (result.length > 0) {
      console.log("Activity database fields:", Object.keys(result[0]))
      console.log("Start latlng text:", result[0].start_latlng_text)
      console.log("End latlng text:", result[0].end_latlng_text)
      console.log("Polyline available:", !!result[0].polyline)
    }

    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error("Failed to get activity:", error)
    return null
  }
}

export default async function ActivityDetailPage({ params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id)
  const activity = await getActivity(id)

  if (!activity) {
    notFound()
  }

  // Debug the raw data from the database
  console.log("Activity ID:", id)
  console.log("Activity Strava ID:", activity.strava_id)
  console.log("Activity map_data type:", typeof activity.map_data)
  console.log("Activity raw_data type:", typeof activity.raw_data)
  console.log("Activity polyline:", activity.polyline ? activity.polyline.substring(0, 20) + "..." : "null")

  // Parse the map_data and raw_data JSON strings
  let mapData = null
  let rawData = null

  try {
    // Try to parse start_latlng and end_latlng if they exist
    let startLatLng = null
    let endLatLng = null

    if (activity.start_latlng) {
      try {
        if (typeof activity.start_latlng === "string") {
          startLatLng = JSON.parse(activity.start_latlng)
        } else {
          startLatLng = activity.start_latlng
        }
      } catch (e) {
        console.error("Error parsing start_latlng:", e)
      }
    }

    if (activity.end_latlng) {
      try {
        if (typeof activity.end_latlng === "string") {
          endLatLng = JSON.parse(activity.end_latlng)
        } else {
          endLatLng = activity.end_latlng
        }
      } catch (e) {
        console.error("Error parsing end_latlng:", e)
      }
    }

    // Check if map_data exists and parse it if it's a string
    if (activity.map_data) {
      // Check if it's already an object
      if (typeof activity.map_data === "object") {
        mapData = activity.map_data
      } else {
        try {
          mapData = JSON.parse(activity.map_data)
        } catch (e) {
          console.error("Error parsing map_data:", e)
          // Keep the original string if parsing fails
          mapData = activity.map_data
        }
      }
    }

    // Check if raw_data exists and parse it if it's a string
    if (activity.raw_data) {
      // Check if it's already an object
      if (typeof activity.raw_data === "object") {
        rawData = activity.raw_data
      } else {
        try {
          rawData = JSON.parse(activity.raw_data)
        } catch (e) {
          console.error("Error parsing raw_data:", e)
          // Keep the original string if parsing fails
          rawData = activity.raw_data
        }
      }
    }

    // If we have start/end coordinates, add them to mapData for the map component to use
    if (startLatLng || endLatLng) {
      if (!mapData || typeof mapData !== "object") {
        mapData = {}
      }

      if (startLatLng) {
        mapData.start_latlng = startLatLng
      }

      if (endLatLng) {
        mapData.end_latlng = endLatLng
      }
    }
  } catch (error) {
    console.error("Error processing activity data:", error)
    // Continue with null values for mapData and rawData
  }

  // Format functions
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${remainingSeconds}s`
  }

  const formatDistance = (meters: number) => {
    // Convert meters to miles
    const miles = meters * 0.000621371
    return `${miles.toFixed(2)} miles`
  }

  const formatElevation = (meters: number) => {
    // Convert meters to feet
    const feet = meters * 3.28084
    return `${feet.toFixed(0)} ft`
  }

  const formatSpeed = (metersPerSecond: number) => {
    // Convert m/s to mph
    const mph = metersPerSecond * 2.23694
    return `${mph.toFixed(1)} mph`
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "MMMM d, yyyy 'at' h:mm a")
  }

  // Activity type icon mapping
  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "run":
        return <Running className="h-6 w-6 text-orange-500" />
      case "ride":
        return <Bike className="h-6 w-6 text-blue-500" />
      case "swim":
        return <Swim className="h-6 w-6 text-cyan-500" />
      case "hike":
        return <Mountain className="h-6 w-6 text-green-600" />
      case "walk":
        return <FootprintsIcon className="h-6 w-6 text-emerald-500" />
      default:
        return <Dumbbell className="h-6 w-6 text-purple-500" />
    }
  }

  // Calculate activity end time
  const activityStartDate = activity.start_date
  const activityEndDate = new Date(new Date(activity.start_date).getTime() + activity.elapsed_time * 1000).toISOString()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/activities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Activities
            </Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`https://www.strava.com/activities/${activity.strava_id}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Strava
          </a>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{activity.name}</h1>
        <p className="text-muted-foreground">{formatDateTime(activity.start_date)}</p>
      </div>

      {/* Moved Type, Distance, and Duration boxes above the map */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getActivityIcon(activity.type)}
              <p className="text-2xl font-bold">{activity.type}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatDistance(activity.distance)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatDuration(activity.elapsed_time)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Map */}
      <ActivityMap
        mapData={mapData}
        rawData={rawData}
        stravaId={activity.strava_id}
        polyline={activity.polyline}
        activityType={activity.type}
        activityDate={activity.start_date}
      />

      {/* AI Performance Analysis */}
      <ActivityAIAnalysis activity={activity} />

      {/* Activity Photos Section */}
      <ActivityPhotos
        activityStartDate={activityStartDate}
        activityEndDate={activityEndDate}
        activityName={activity.name}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Elevation Gain</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatElevation(activity.total_elevation_gain)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatSpeed(activity.average_speed)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Max Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatSpeed(activity.max_speed)}</p>
          </CardContent>
        </Card>
      </div>

      {activity.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{activity.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Additional activity details could be added here */}
    </div>
  )
}
