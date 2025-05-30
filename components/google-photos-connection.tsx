"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, XCircle, Calendar } from "lucide-react"
import { connectGooglePhotos, disconnectGooglePhotos, testGooglePhotos } from "@/lib/google-photos-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImageIcon } from "lucide-react"

interface GooglePhotosConnectionProps {
  initialConnection: {
    isConnected: boolean
    userName?: string
    connectedAt?: string
    accessToken?: string
    refreshToken?: string
    tokenExpiry?: number
  }
  apiConfigured: boolean
}

export function GooglePhotosConnection({ initialConnection, apiConfigured }: GooglePhotosConnectionProps) {
  const { toast } = useToast()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([])
  const [showPhotos, setShowPhotos] = useState(false)

  const handleConnect = async () => {
    if (!apiConfigured) {
      toast({
        title: "API not configured",
        description: "Please configure your Google Photos API credentials first",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)

    try {
      const result = await connectGooglePhotos()
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Failed to start Google Photos connection",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)

    try {
      await disconnectGooglePhotos()
      toast({
        title: "Disconnected",
        description: "Your Google Photos account has been disconnected",
      })
      // Reload the page to update the connection status
      window.location.reload()
    } catch (error) {
      toast({
        title: "Disconnection error",
        description: error instanceof Error ? error.message : "Failed to disconnect Google Photos",
        variant: "destructive",
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleTest = async () => {
    if (!initialConnection.isConnected) {
      toast({
        title: "Not connected",
        description: "Please connect your Google Photos account first",
        variant: "destructive",
      })
      return
    }

    if (!startDate || !endDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)

    try {
      const result = await testGooglePhotos({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      })

      setPhotos(result.photos)
      setShowPhotos(true)

      if (result.photos.length === 0) {
        toast({
          title: "No photos found",
          description: "No photos found for the selected date range",
        })
      }
    } catch (error) {
      toast({
        title: "Test error",
        description: error instanceof Error ? error.message : "Failed to test Google Photos connection",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  if (!apiConfigured) {
    return (
      <Alert>
        <AlertDescription>
          Google Photos API credentials are not configured. Please go to the Google API tab to configure them.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {initialConnection.isConnected ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Connected to Google Photos</span>
          </div>

          {initialConnection.userName && (
            <div className="text-sm">
              <span className="font-medium">User:</span> {initialConnection.userName}
            </div>
          )}

          {initialConnection.connectedAt && (
            <div className="text-sm">
              <span className="font-medium">Connected at:</span>{" "}
              {new Date(initialConnection.connectedAt).toLocaleString()}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Test Connection</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Select a date range to test fetching photos from your Google Photos account
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="start-date" className="text-sm font-medium">
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="end-date" className="text-sm font-medium">
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTest} disabled={isTesting} className="flex-1">
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fetch Photos
              </Button>

              <Button onClick={handleDisconnect} disabled={isDisconnecting} variant="outline" className="flex-1">
                {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disconnect
              </Button>
            </div>
          </div>

          <Dialog open={showPhotos} onOpenChange={setShowPhotos}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  Photos from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                </DialogTitle>
                <DialogDescription>Found {photos.length} photos in the selected date range</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 max-h-[60vh] overflow-y-auto p-1">
                {photos.length > 0 ? (
                  photos.map((photo) => (
                    <div key={photo.id} className="aspect-square rounded-md overflow-hidden">
                      <img
                        src={photo.url || "/placeholder.svg"}
                        alt="Google Photos thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8" />
                    <p>No photos found for the selected date range</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            <span>Not connected to Google Photos</span>
          </div>

          <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
            {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Google Photos
          </Button>
        </div>
      )}
    </div>
  )
}
