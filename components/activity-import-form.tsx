"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon, Loader2, AlertCircle, X } from "lucide-react"
import { importActivities, countActivitiesInDateRange } from "@/lib/actions"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ActivityImportFormProps {
  disabled?: boolean
}

export function ActivityImportForm({ disabled = false }: ActivityImportFormProps) {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  )
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [startDateInput, setStartDateInput] = useState<string>(startDate ? format(startDate, "MM/dd/yy") : "")
  const [endDateInput, setEndDateInput] = useState<string>(endDate ? format(endDate, "MM/dd/yy") : "")
  const [isImporting, setIsImporting] = useState(false)
  const [isCounting, setIsCounting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [activityCount, setActivityCount] = useState<number | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Update input fields when dates change via calendar
  useEffect(() => {
    if (startDate) {
      setStartDateInput(format(startDate, "MM/dd/yy"))
    }
  }, [startDate])

  useEffect(() => {
    if (endDate) {
      setEndDateInput(format(endDate, "MM/dd/yy"))
    }
  }, [endDate])

  // Handle manual date input
  const handleStartDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStartDateInput(value)

    try {
      // Only attempt to parse if we have a complete date format
      if (value.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
        // Parse with a 2000s year prefix for 2-digit years
        const parsedDate = parse(value, "MM/dd/yy", new Date())

        // Ensure the year is interpreted correctly (e.g., "25" becomes 2025, not 0025)
        if (isValid(parsedDate)) {
          setStartDate(parsedDate)
        }
      }
    } catch (error) {
      // Invalid date format, don't update the date
      console.error("Error parsing date:", error)
    }
  }

  const handleEndDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEndDateInput(value)

    try {
      // Only attempt to parse if we have a complete date format
      if (value.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
        // Parse with a 2000s year prefix for 2-digit years
        const parsedDate = parse(value, "MM/dd/yy", new Date())

        // Ensure the year is interpreted correctly (e.g., "25" becomes 2025, not 0025)
        if (isValid(parsedDate)) {
          setEndDate(parsedDate)
        }
      }
    } catch (error) {
      // Invalid date format, don't update the date
      console.error("Error parsing date:", error)
    }
  }

  const handleCheckCount = async () => {
    if (disabled) {
      toast({
        title: "Connection required",
        description: "Please connect to Strava first before checking activities",
        variant: "destructive",
      })
      return
    }

    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (startDate > endDate) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setIsCounting(true)
    setError(null)
    setDebugInfo(null)

    try {
      console.log("Calling countActivitiesInDateRange server action...")

      // Use the server action directly
      const count = await countActivitiesInDateRange(startDate.toISOString(), endDate.toISOString())

      console.log("Server action response:", count)
      setDebugInfo(`Count result: ${count}`)

      setActivityCount(count)
      setConfirmDialogOpen(true)
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `${error.message} (${format(startDate, "MMM d, yyyy")} to ${format(endDate, "MMM d, yyyy")})`
          : `Failed to count activities between ${format(startDate, "MMM d, yyyy")} and ${format(endDate, "MMM d, yyyy")}`

      setError(errorMessage)

      toast({
        title: "Error counting activities",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCounting(false)
    }
  }

  const handleImport = async () => {
    if (disabled) {
      toast({
        title: "Connection required",
        description: "Please connect to Strava first before importing activities",
        variant: "destructive",
      })
      return
    }

    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (startDate > endDate) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    setProgress(0)
    setImportStatus("Preparing to import activities...")
    setError(null)
    setConfirmDialogOpen(false)

    // Create a new AbortController for this import
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      console.log("Starting import...")

      // Try server action first, fall back to API route if it fails
      let result
      let useApiRoute = false

      try {
        console.log("Attempting server action import...")
        result = await importActivities({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          onProgress: (status, percent) => {
            console.log(`Import progress: ${percent}% - ${status}`)
            setImportStatus(status)
            setProgress(percent)
          },
          signal,
        })
        console.log("Server action import completed:", result)
      } catch (serverActionError) {
        console.error("Server action failed, trying API route:", serverActionError)
        useApiRoute = true

        // Fall back to API route
        setImportStatus("Retrying import via API...")
        setProgress(25)

        const response = await fetch("/api/import-activities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Server error: ${response.status}`)
        }

        result = await response.json()
        console.log("API route import completed:", result)

        if (!result.success) {
          throw new Error(result.error || "Import failed")
        }

        // Simulate progress for API route since we can't get real-time updates
        setProgress(75)
        setImportStatus("Processing activities...")
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      setProgress(100)
      setImportStatus(
        `Import completed successfully! Imported ${result.count} activities${useApiRoute ? " (via API)" : ""}.`,
      )

      toast({
        title: "Import successful",
        description: `Successfully imported ${result.count} Strava activities.`,
      })

      // Reset the form state after successful import
      setTimeout(() => {
        setProgress(0)
        setImportStatus(null)
        setActivityCount(null)
      }, 3000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import activities"

      console.error("Import error:", error)

      // Don't show error toast if it was a user cancellation
      if (errorMessage !== "Import cancelled by user" && !signal?.aborted) {
        setImportStatus("Import failed. Please try again.")
        setError(errorMessage)

        toast({
          title: "Import failed",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        setImportStatus("Import cancelled by user.")
        setProgress(0)
      }
    } finally {
      setIsImporting(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setImportStatus("Cancelling import...")
    }
  }

  return (
    <div className="space-y-4">
      {disabled && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Connect to Strava first to enable activity import functionality.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Date</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="MM/DD/YY"
              value={startDateInput}
              onChange={handleStartDateInput}
              className="flex-1"
              disabled={disabled}
            />
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="px-2" disabled={disabled}>
                  <CalendarIcon className="h-4 w-4" />
                  <span className="sr-only">Open calendar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date)
                    setStartDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="MM/DD/YY"
              value={endDateInput}
              onChange={handleEndDateInput}
              className="flex-1"
              disabled={disabled}
            />
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="px-2" disabled={disabled}>
                  <CalendarIcon className="h-4 w-4" />
                  <span className="sr-only">Open calendar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date)
                    setEndDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <Button
        onClick={handleCheckCount}
        disabled={disabled || isImporting || isCounting || !startDate || !endDate}
        className="w-full"
      >
        {isCounting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Check Activities
      </Button>

      {(isImporting || importStatus) && (
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{importStatus}</p>
            {isImporting && (
              <Button variant="destructive" size="sm" onClick={handleCancelImport} className="flex items-center gap-1">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
          {isImporting && <Progress value={progress} className="h-2" />}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Error</AlertTitle>
          <AlertDescription>
            {error}
            {startDate && endDate && (
              <div className="mt-2">
                Date range searched: {format(startDate, "MMM d, yyyy")} to {format(endDate, "MMM d, yyyy")}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Information */}
      {debugInfo && process.env.NODE_ENV === "development" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">{debugInfo}</pre>
          </AlertDescription>
        </Alert>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              {activityCount === 0
                ? `No activities found between ${format(startDate || new Date(), "MMM d, yyyy")} and ${format(
                    endDate || new Date(),
                    "MMM d, yyyy",
                  )}. Please try a different date range.`
                : `Found ${activityCount} activities between ${format(startDate || new Date(), "MMM d, yyyy")} and ${format(
                    endDate || new Date(),
                    "MMM d, yyyy",
                  )}. Do you want to import them?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            {activityCount !== null && (
              <Button onClick={handleImport} disabled={disabled || isImporting}>
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activityCount > 0 ? `Import ${activityCount} Activities` : "Try Import Anyway"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
