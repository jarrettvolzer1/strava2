"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { connectStrava, disconnectStrava, testStravaConnection } from "@/lib/actions"
import { useSearchParams } from "next/navigation"

interface StravaConnectionFormProps {
  initialConnection: any | null
}

export function StravaConnectionForm({ initialConnection }: StravaConnectionFormProps) {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [isConnected, setIsConnected] = useState(!!initialConnection)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error" | null>(
    initialConnection ? "connected" : "disconnected",
  )
  const [athleteInfo, setAthleteInfo] = useState<any>(null)

  // Handle OAuth callback results
  useEffect(() => {
    const error = searchParams.get("error")
    const success = searchParams.get("success")

    if (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Strava. Please try again.",
        variant: "destructive",
      })
    } else if (success) {
      toast({
        title: "Connected to Strava",
        description: "Your Strava account has been successfully connected.",
      })
      setIsConnected(true)
      setConnectionStatus("connected")
    }
  }, [searchParams, toast])

  const handleConnect = async () => {
    try {
      const { authUrl } = await connectStrava()
      // Redirect to Strava authorization page
      window.location.href = authUrl
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to Strava",
        variant: "destructive",
      })
    }
  }

  const handleTest = async () => {
    setIsTesting(true)

    try {
      const { profile } = await testStravaConnection()
      setAthleteInfo(profile)
      toast({
        title: "Connection successful",
        description: `Connected to Strava as ${profile.firstname} ${profile.lastname}`,
      })
      setConnectionStatus("connected")
    } catch (error) {
      setConnectionStatus("error")
      toast({
        title: "Connection test failed",
        description: error instanceof Error ? error.message : "Failed to connect to Strava",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)

    try {
      await disconnectStrava()
      setIsConnected(false)
      setConnectionStatus("disconnected")
      setAthleteInfo(null)
      toast({
        title: "Disconnected from Strava",
        description: "Your Strava account has been disconnected.",
      })
    } catch (error) {
      toast({
        title: "Disconnection failed",
        description: error instanceof Error ? error.message : "Failed to disconnect from Strava",
        variant: "destructive",
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <div className="space-y-4">
          <Button onClick={handleConnect} className="w-full">
            Connect to Strava
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>
              Connecting to Strava will allow this application to access your activities. You will be redirected to
              Strava to authorize this application.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              {connectionStatus === "connected" ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : connectionStatus === "error" ? (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              ) : null}
              <div>
                <p className="font-medium">
                  {connectionStatus === "connected"
                    ? "Connected to Strava"
                    : connectionStatus === "error"
                      ? "Connection error"
                      : "Strava connection"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {initialConnection?.athlete_id
                    ? `Athlete ID: ${initialConnection.athlete_id}`
                    : "Connected to Strava API"}
                </p>
                {athleteInfo && (
                  <p className="text-sm text-muted-foreground">
                    {athleteInfo.firstname} {athleteInfo.lastname}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                {isTesting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Test
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={isDisconnecting}>
                {isDisconnecting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Disconnect
              </Button>
            </div>
          </Card>

          <div className="text-sm text-muted-foreground">
            <p>Your Strava account is connected. You can now import activities.</p>
          </div>
        </div>
      )}
    </div>
  )
}
