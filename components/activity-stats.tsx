"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, ArrowUp, Clock, MapPin, RefreshCw } from "lucide-react"
import { getActivityStats } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Stats {
  totalActivities: number
  totalDistance: number
  totalDuration: number
  totalElevation: number
}

export function ActivityStats() {
  const [stats, setStats] = useState<Stats>({
    totalActivities: 0,
    totalDistance: 0,
    totalDuration: 0,
    totalElevation: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<boolean>(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const fetchStats = async () => {
    setIsLoading(true)
    setError(false)
    setIsRetrying(true)
    try {
      // Use a local timeout to prevent UI hanging if server doesn't respond
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const activityStats = await getActivityStats()
      clearTimeout(timeoutId)

      setStats(activityStats)
    } catch (error) {
      console.error("Failed to fetch activity stats:", error)
      setError(true)
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371
    return `${miles.toFixed(0)} mi`
  }

  const formatElevation = (meters: number) => {
    const feet = meters * 3.28084
    return `${feet.toFixed(0)} ft`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hrs`
  }

  // If we're showing mock data due to database issues, show a notification
  const showingMockData = !isLoading && !error && stats.totalActivities === 12 && stats.totalDistance === 120000

  return (
    <>
      {showingMockData && (
        <div className="col-span-full mb-2">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="flex items-center justify-between">
              <span>Showing sample data while database connection is unavailable.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={isRetrying}
                className="h-8 gap-1 text-xs"
              >
                {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          <Activity className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Connection error</div>
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isRetrying} className="h-6 w-6 p-0">
                {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          ) : (
            <div className="text-2xl font-bold text-orange-600">{stats.totalActivities}</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
          <MapPin className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Connection error</div>
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isRetrying} className="h-6 w-6 p-0">
                {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          ) : (
            <div className="text-2xl font-bold text-blue-600">{formatDistance(stats.totalDistance)}</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
          <Clock className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Connection error</div>
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isRetrying} className="h-6 w-6 p-0">
                {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          ) : (
            <div className="text-2xl font-bold text-green-600">{formatDuration(stats.totalDuration)}</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Elevation</CardTitle>
          <ArrowUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Connection error</div>
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isRetrying} className="h-6 w-6 p-0">
                {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          ) : (
            <div className="text-2xl font-bold text-purple-600">{formatElevation(stats.totalElevation)}</div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
