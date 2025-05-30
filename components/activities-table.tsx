"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import {
  ChevronDown,
  MoreHorizontal,
  Search,
  ExternalLink,
  Trash,
  MonitorIcon as Running,
  Bike,
  FishIcon as Swim,
  Mountain,
  FootprintsIcon,
  Dumbbell,
  Map,
  RefreshCw,
  AlertCircle,
  Brain,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { deleteActivity } from "@/lib/actions"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ActivityMap } from "./activity-map"
import { ActivityComparisonAI } from "./activity-comparison-ai"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

interface ActivitiesTableProps {
  activities: Activity[]
}

export function ActivitiesTable({ activities: initialActivities }: ActivitiesTableProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([])
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [isMockData, setIsMockData] = useState(false)

  // Check if we're likely using mock data
  useEffect(() => {
    // Check for patterns that suggest mock data
    const mockDataPattern = initialActivities.some(
      (a) =>
        (a.id >= 10000 && a.id < 20000) || // Our mock data ID range
        (a.strava_id >= 10000 && a.strava_id < 20000), // Our mock data strava_id range
    )

    setIsMockData(mockDataPattern)
  }, [initialActivities])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${remainingSeconds}s`
  }

  const formatDistance = (meters: number) => {
    // Convert meters to miles (1 meter = 0.000621371 miles)
    const miles = meters * 0.000621371
    return `${miles.toFixed(2)} mi`
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "MMM d, yyyy 'at' h:mm a")
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)

    if (!term.trim()) {
      setActivities(initialActivities)
      return
    }

    const filtered = initialActivities.filter(
      (activity) =>
        activity.name.toLowerCase().includes(term.toLowerCase()) ||
        activity.type.toLowerCase().includes(term.toLowerCase()),
    )

    setActivities(filtered)
  }

  const handleDeleteClick = (activity: Activity) => {
    setActivityToDelete(activity)
    setIsAlertOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!activityToDelete) return

    try {
      await deleteActivity(activityToDelete.id)

      // Remove the activity from the local state
      setActivities(activities.filter((activity) => activity.id !== activityToDelete.id))

      // Also remove from selected activities if it was selected
      setSelectedActivities(selectedActivities.filter((a) => a.id !== activityToDelete.id))

      toast({
        title: "Activity deleted",
        description: "The activity has been removed from your database.",
      })
    } catch (error) {
      toast({
        title: "Error deleting activity",
        description: error instanceof Error ? error.message : "Failed to delete activity",
        variant: "destructive",
      })
    } finally {
      setIsAlertOpen(false)
      setActivityToDelete(null)
    }
  }

  const openStravaActivity = (stravaId: number) => {
    window.open(`https://www.strava.com/activities/${stravaId}`, "_blank")
  }

  // Activity type icon mapping
  const getActivityIcon = (type: string) => {
    // Normalize the type to lowercase for consistent comparison
    const normalizedType = type.toLowerCase().replace(/[_\s]/g, "")

    switch (normalizedType) {
      case "run":
        return <Running className="h-5 w-5 text-orange-500" />
      case "ride":
        return <Bike className="h-5 w-5 text-blue-500" />
      case "swim":
        return <Swim className="h-5 w-5 text-cyan-500" />
      case "hike":
        return <Mountain className="h-5 w-5 text-green-600" />
      case "walk":
        return <FootprintsIcon className="h-5 w-5 text-emerald-500" />
      case "standuppaddling":
      case "standuppaddle":
      case "sup":
      case "paddleboard":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            className="h-5 w-5 text-cyan-600"
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
            width="20"
            height="20"
            className="h-5 w-5 text-red-500"
          >
            <path fill="currentColor" d="M4 12 L20 12 L18 16 L6 16 Z" />
            <path fill="#8B4513" d="M3 10 L7 12 L7 14 L3 16 Z" />
            <path fill="#8B4513" d="M21 10 L17 12 L17 14 L21 16 Z" />
          </svg>
        )
      default:
        return <Dumbbell className="h-5 w-5 text-purple-500" />
    }
  }

  const toggleActivitySelection = (activity: Activity) => {
    if (selectedActivities.some((a) => a.id === activity.id)) {
      setSelectedActivities(selectedActivities.filter((a) => a.id !== activity.id))
    } else {
      setSelectedActivities([...selectedActivities, activity])
    }
  }

  const handleCompareOnMap = () => {
    if (selectedActivities.length < 1) {
      toast({
        title: "Select activities",
        description: "Please select at least one activity to view on the map.",
      })
      return
    }

    setIsMapDialogOpen(true)
  }

  const handleAIComparison = () => {
    if (selectedActivities.length < 2) {
      toast({
        title: "Select activities",
        description: "Please select at least 2 activities for AI comparison.",
      })
      return
    }

    setIsAIDialogOpen(true)
  }

  const handleRefresh = () => {
    // Refresh the page to get fresh data
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {isMockData && (
        <Alert className="bg-amber-50 border-amber-200 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center justify-between">
            <span>Showing sample data while database connection is unavailable.</span>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 gap-1 text-xs">
              <RefreshCw className="h-3 w-3" />
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search activities..." className="pl-8" value={searchTerm} onChange={handleSearch} />
        </div>
        <div className="flex items-center gap-2">
          {selectedActivities.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleCompareOnMap} className="flex items-center gap-1">
                <Map className="h-4 w-4 mr-1" />
                Map ({selectedActivities.length})
              </Button>
              {selectedActivities.length >= 2 && (
                <Button variant="outline" size="sm" onClick={handleAIComparison} className="flex items-center gap-1">
                  <Brain className="h-4 w-4 mr-1" />
                  AI Compare ({selectedActivities.length})
                </Button>
              )}
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Activity Type <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActivities(initialActivities)}>All Types</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const filtered = initialActivities.filter((a) => a.type.toLowerCase() === "run")
                  setActivities(filtered)
                }}
              >
                <Running className="h-4 w-4 text-orange-500 mr-2" />
                Run
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const filtered = initialActivities.filter((a) => a.type.toLowerCase() === "ride")
                  setActivities(filtered)
                }}
              >
                <Bike className="h-4 w-4 text-blue-500 mr-2" />
                Ride
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const filtered = initialActivities.filter((a) => a.type.toLowerCase() === "swim")
                  setActivities(filtered)
                }}
              >
                <Swim className="h-4 w-4 text-cyan-500 mr-2" />
                Swim
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const filtered = initialActivities.filter((a) => a.type.toLowerCase() === "hike")
                  setActivities(filtered)
                }}
              >
                <Mountain className="h-4 w-4 text-green-600 mr-2" />
                Hike
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const filtered = initialActivities.filter((a) => a.type.toLowerCase() === "walk")
                  setActivities(filtered)
                }}
              >
                <FootprintsIcon className="h-4 w-4 text-emerald-500 mr-2" />
                Walk
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const filtered = initialActivities.filter((a) => {
                    const normalizedType = a.type.toLowerCase().replace(/[_\s]/g, "")
                    return (
                      normalizedType === "standuppaddling" ||
                      normalizedType === "standuppaddle" ||
                      normalizedType === "sup" ||
                      normalizedType === "paddleboard"
                    )
                  })
                  setActivities(filtered)
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  className="h-4 w-4 text-cyan-600 mr-2"
                >
                  <rect fill="currentColor" x="7" y="10" width="10" height="12" rx="1" ry="1" />
                  <rect fill="#8B4513" x="11.5" y="2" width="1" height="16" />
                  <circle fill="#FFA500" cx="12" cy="6" r="2.5" />
                </svg>
                StandUp Paddling
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  const filtered = initialActivities.filter((a) => {
                    const normalizedType = a.type.toLowerCase().replace(/[_\s]/g, "")
                    return normalizedType === "kayaking" || normalizedType === "kayak"
                  })
                  setActivities(filtered)
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  className="h-4 w-4 text-red-500 mr-2"
                >
                  <path fill="currentColor" d="M4 12 L20 12 L18 16 L6 16 Z" />
                  <path fill="#8B4513" d="M3 10 L7 12 L7 14 L3 16 Z" />
                  <path fill="#8B4513" d="M21 10 L17 12 L17 14 L21 16 Z" />
                </svg>
                Kayaking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No activities found. Import some activities first.
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow
                  key={activity.id}
                  className={selectedActivities.some((a) => a.id === activity.id) ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedActivities.some((a) => a.id === activity.id)}
                      onCheckedChange={() => toggleActivitySelection(activity)}
                      aria-label={`Select ${activity.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/activities/${activity.id}`}
                      className="hover:text-orange-600 hover:underline transition-colors"
                    >
                      {activity.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.type)}
                      <span>{activity.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(activity.start_date)}</TableCell>
                  <TableCell>{formatDuration(activity.elapsed_time)}</TableCell>
                  <TableCell>{formatDistance(activity.distance)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/activities/${activity.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openStravaActivity(activity.strava_id)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Strava
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(activity)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Activity Map Dialog */}
      <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Activity Map Comparison</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ActivityMap activities={selectedActivities} />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Comparison Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>AI Activity Comparison</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ActivityComparisonAI activities={selectedActivities} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This will only remove it from your local database. It may
              be re-imported if you import activities from Strava again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
