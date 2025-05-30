"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, Loader2, AlertCircle, Clock } from "lucide-react"
import { testGooglePhotos } from "@/lib/google-photos-actions"
import { format, parseISO, isWithinInterval } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface ActivityPhotosProps {
  activityStartDate: string
  activityEndDate: string
  activityName: string
}

interface Photo {
  id: string
  url: string
  creationTime: string | null
  width?: number
  height?: number
}

export function ActivityPhotos({ activityStartDate, activityEndDate, activityName }: ActivityPhotosProps) {
  const [allPhotos, setAllPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [activeTab, setActiveTab] = useState("activity")

  // Filter photos based on activity time range
  const activityStartTime = new Date(activityStartDate)
  const activityEndTime = new Date(activityEndDate)

  const activityPhotos = allPhotos.filter((photo) => {
    if (!photo.creationTime) return false

    try {
      const photoTime = parseISO(photo.creationTime)
      return isWithinInterval(photoTime, {
        start: activityStartTime,
        end: activityEndTime,
      })
    } catch (e) {
      return false
    }
  })

  const otherPhotos = allPhotos.filter((photo) => {
    if (!photo.creationTime) return false

    try {
      const photoTime = parseISO(photo.creationTime)
      return !isWithinInterval(photoTime, {
        start: activityStartTime,
        end: activityEndTime,
      })
    } catch (e) {
      return false
    }
  })

  const handleFetchPhotos = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Format dates for the API call - just use the date part
      const startDate = format(activityStartTime, "yyyy-MM-dd")
      const endDate = format(activityEndTime, "yyyy-MM-dd")

      const result = await testGooglePhotos({ startDate, endDate })
      setAllPhotos(result.photos)
      setHasFetched(true)

      // Set active tab based on results
      if (result.photos.length > 0) {
        const hasActivityPhotos = result.photos.some((photo) => {
          if (!photo.creationTime) return false
          try {
            const photoTime = parseISO(photo.creationTime)
            return isWithinInterval(photoTime, { start: activityStartTime, end: activityEndTime })
          } catch (e) {
            return false
          }
        })

        setActiveTab(hasActivityPhotos ? "activity" : "all")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch photos")
    } finally {
      setIsLoading(false)
    }
  }

  const formatPhotoTime = (timeString: string | null) => {
    if (!timeString) return "Unknown time"
    try {
      return format(parseISO(timeString), "h:mm a")
    } catch (e) {
      return "Invalid time"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Activity Photos
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Photos from your Google Photos account taken during this activity
          </p>
        </div>
        <Button
          onClick={handleFetchPhotos}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              {hasFetched ? "Refresh Photos" : "Fetch Photos"}
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 mb-4">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!hasFetched && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Fetch Photos" to load photos from your Google Photos account</p>
            <p className="text-sm mt-2">
              Activity time: {format(activityStartTime, "MMM d, yyyy 'at' h:mm a")} -{" "}
              {format(activityEndTime, "h:mm a")}
            </p>
          </div>
        )}

        {hasFetched && allPhotos.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No photos found on this day</p>
            <p className="text-sm mt-2">Searched for {format(activityStartTime, "MMMM d, yyyy")}</p>
          </div>
        )}

        {hasFetched && allPhotos.length > 0 && !isLoading && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="activity" className="flex items-center gap-1">
                  During Activity
                  {activityPhotos.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activityPhotos.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-1">
                  All Day Photos
                  {allPhotos.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {allPhotos.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <p className="text-xs text-muted-foreground">{format(activityStartTime, "MMMM d, yyyy")}</p>
            </div>

            <TabsContent value="activity" className="mt-0">
              {activityPhotos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No photos found during this activity</p>
                  <p className="text-sm mt-2">
                    {format(activityStartTime, "h:mm a")} - {format(activityEndTime, "h:mm a")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {activityPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative group"
                    >
                      <img
                        src={photo.url || "/placeholder.svg"}
                        alt="Activity photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatPhotoTime(photo.creationTime)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative group ${
                      activityPhotos.some((p) => p.id === photo.id) ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <img
                      src={photo.url || "/placeholder.svg"}
                      alt="Day photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatPhotoTime(photo.creationTime)}
                    </div>
                    {activityPhotos.some((p) => p.id === photo.id) && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-blue-500">Activity</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
