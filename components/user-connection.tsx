"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, Loader2, ExternalLink, Info } from "lucide-react"
import { connectStrava, disconnectStrava, testStravaConnection } from "@/lib/actions"
import { useSearchParams } from "next/navigation"

interface UserConnectionProps {
  initialConnection: any | null
  apiConfigured: boolean
}

export function UserConnection({ initialConnection, apiConfigured }: UserConnectionProps) {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [isConnected, setIsConnected] = useState(!!initialConnection)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error" | null>(
    initialConnection ? "connected" : "disconnected",
  )
  const [athleteInfo, setAthleteInfo] = useState<any>(null)
  const [errorDetails, setErrorDetails] = useState<any>(null)

  // Handle OAuth callback results and errors
  useEffect(() => {
    const error = searchParams.get("error")
    const success = searchParams.get("success")
    const details = searchParams.get("details")

    if (error) {
      let errorData = null
      if (details) {
        try {
          errorData = JSON.parse(decodeURIComponent(details))
        } catch (e) {
          console.error("Failed to parse error details:", e)
        }
      }

      setErrorDetails(errorData)
      setConnectionStatus("error")

      const errorMessages = {
        oauth_error: "OAuth authorization failed",
        config_error: "API configuration error",
        token_error: "Token exchange failed",
        data_error: "Invalid response data",
        server_error: "Server error occurred",
      }

      toast({
        title: "Connection failed",
        description: errorMessages[error] || "Failed to connect to Strava",
        variant: "destructive",
      })
    } else if (success === "connected") {
      toast({
        title: "Connected to Strava",
        description: "Your Strava account has been successfully connected.",
      })
      setIsConnected(true)
      setConnectionStatus("connected")
      setErrorDetails(null)
    }
  }, [searchParams, toast])

  const handleConnect = async () => {
    if (!apiConfigured) {
      toast({
        title: "API not configured",
        description: "Please configure your Strava API credentials first.",
        variant: "destructive",
      })
      return
    }

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
      setErrorDetails(null)
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
      setErrorDetails(null)
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

  if (!apiConfigured) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Strava API credentials are not configured. Please configure them in the Strava API tab first.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {!isConnected ? (
        <div className="space-y-4">
          <Button onClick={handleConnect} className="w-full" size="lg">
            <ExternalLink className="mr-2 h-4 w-4" />
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
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {connectionStatus === "connected" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : connectionStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Info className="h-5 w-5 text-blue-500" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">
                      {connectionStatus === "connected"
                        ? "Connected to Strava"
                        : connectionStatus === "error"
                          ? "Connection Error"
                          : "Strava Connection"}
                    </p>
                    <Badge
                      variant={
                        connectionStatus === "connected"
                          ? "default"
                          : connectionStatus === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {connectionStatus === "connected" ? "Active" : connectionStatus === "error" ? "Error" : "Unknown"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {initialConnection?.athlete_id && <p>Athlete ID: {initialConnection.athlete_id}</p>}
                    {athleteInfo && (
                      <p>
                        {athleteInfo.firstname} {athleteInfo.lastname}
                      </p>
                    )}
                    {initialConnection?.scope && <p>Permissions: {initialConnection.scope}</p>}
                    {initialConnection?.expires_at && (
                      <p>Expires: {new Date(initialConnection.expires_at).toLocaleDateString()}</p>
                    )}
                  </div>
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
            </div>
          </Card>

          <div className="text-sm text-muted-foreground">
            <p>Your Strava account is connected. You can now import activities and access your data.</p>
          </div>
        </div>
      )}

      {/* Error Details */}
      {errorDetails && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              Connection Error Details
            </CardTitle>
            <CardDescription className="text-red-700">
              Technical information about the connection failure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-sm text-red-800">Error Type:</p>
                <p className="text-sm text-red-700">{errorDetails.error || "Unknown"}</p>
              </div>
              <div>
                <p className="font-medium text-sm text-red-800">Description:</p>
                <p className="text-sm text-red-700">{errorDetails.description || "No description available"}</p>
              </div>
              {errorDetails.status && (
                <div>
                  <p className="font-medium text-sm text-red-800">HTTP Status:</p>
                  <p className="text-sm text-red-700">{errorDetails.status}</p>
                </div>
              )}
              {errorDetails.response && (
                <div>
                  <p className="font-medium text-sm text-red-800">Response:</p>
                  <pre className="text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(errorDetails.response, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p className="font-medium text-sm text-red-800">Timestamp:</p>
                <p className="text-sm text-red-700">{errorDetails.timestamp || "Unknown"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
