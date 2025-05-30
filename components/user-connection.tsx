"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, Loader2, ExternalLink, Info, ChevronDown, ChevronUp, Key } from "lucide-react"
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
  const [testError, setTestError] = useState<any>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isDebugging, setIsDebugging] = useState(false)
  const [debugResults, setDebugResults] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(false)

  // Fetch debug info on component mount
  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const response = await fetch("/api/debug/oauth")
        const data = await response.json()
        setDebugInfo(data)
      } catch (error) {
        console.error("Failed to fetch debug info:", error)
      }
    }
    fetchDebugInfo()
  }, [])

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
      setTestError(null)
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
      const errorData = {
        error: "connection_failed",
        description: error instanceof Error ? error.message : "Failed to connect to Strava",
        timestamp: new Date().toISOString(),
        details: error,
      }
      setErrorDetails(errorData)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to Strava",
        variant: "destructive",
      })
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestError(null)

    try {
      const { profile } = await testStravaConnection()
      setAthleteInfo(profile)
      toast({
        title: "Connection successful",
        description: `Connected to Strava as ${profile.firstname} ${profile.lastname}`,
      })
      setConnectionStatus("connected")
      setTestError(null)
    } catch (error) {
      setConnectionStatus("error")

      console.error("Test connection error:", error)

      // Extract more detailed error information
      const errorData = {
        error: "test_failed",
        description: error instanceof Error ? error.message : "Failed to test Strava connection",
        timestamp: new Date().toISOString(),
        details: {
          message: error instanceof Error ? error.message : "Unknown error",
          cause: error instanceof Error && error.cause ? error.cause : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
        },
      }

      setTestError(errorData)
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
      setTestError(null)
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

  const handleDebugTest = async () => {
    setIsDebugging(true)
    setDebugResults(null)

    try {
      const response = await fetch("/api/debug/strava-test")
      const results = await response.json()
      setDebugResults(results)

      if (results.success) {
        toast({
          title: "Debug test successful",
          description: "All connection components are working correctly",
        })
      } else {
        toast({
          title: "Debug test failed",
          description: `Failed at step: ${results.step}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      setDebugResults({
        success: false,
        error: "Failed to run debug test",
        details: error instanceof Error ? error.message : "Unknown error",
      })
      toast({
        title: "Debug test error",
        description: "Failed to run debug test",
        variant: "destructive",
      })
    } finally {
      setIsDebugging(false)
    }
  }

  const handleCheckSession = async () => {
    setIsCheckingSession(true)
    setSessionInfo(null)

    try {
      const response = await fetch("/api/debug/session")
      const data = await response.json()
      setSessionInfo(data)

      if (data.sessionValid) {
        toast({
          title: "Session valid",
          description: `Logged in as ${data.user.username}`,
        })
      } else {
        toast({
          title: "Session invalid",
          description: data.hasSessionToken ? "Session token exists but is invalid" : "No session token found",
          variant: "destructive",
        })
      }
    } catch (error) {
      setSessionInfo({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      toast({
        title: "Session check failed",
        description: "Failed to check session",
        variant: "destructive",
      })
    } finally {
      setIsCheckingSession(false)
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
      {/* Authentication Status */}
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-purple-800 flex items-center">
            <Key className="mr-2 h-4 w-4" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-purple-700">
              Check your authentication status before testing the Strava connection
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckSession}
              disabled={isCheckingSession}
              className="bg-white border-purple-200 text-purple-700 hover:bg-purple-100"
            >
              {isCheckingSession && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Check Session
            </Button>
          </div>

          {sessionInfo && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Badge
                  variant={sessionInfo.sessionValid ? "default" : "destructive"}
                  className={sessionInfo.sessionValid ? "bg-green-500" : ""}
                >
                  {sessionInfo.sessionValid ? "Authenticated" : "Not Authenticated"}
                </Badge>
                {sessionInfo.user && (
                  <span className="text-sm font-medium">
                    {sessionInfo.user.username} ({sessionInfo.user.email})
                  </span>
                )}
              </div>

              <details className="text-xs text-purple-700">
                <summary className="cursor-pointer font-medium">Session Details</summary>
                <pre className="mt-2 p-2 bg-white rounded overflow-auto max-h-40">
                  {JSON.stringify(sessionInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strava OAuth Authentication Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Strava OAuth Authentication</AlertTitle>
        <AlertDescription>
          To connect your real Strava account, you need to authorize this application through Strava's OAuth flow. Click
          the "Connect to Strava" button below to start the authorization process.
        </AlertDescription>
      </Alert>

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
                <Button variant="outline" size="sm" onClick={handleDebugTest} disabled={isDebugging}>
                  {isDebugging && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Debug
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

      {/* OAuth Error Details */}
      {(errorDetails || testError) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              {testError ? "Connection Test Error" : "OAuth Error Details"}
            </CardTitle>
            <CardDescription className="text-red-700">
              {testError
                ? "Error occurred while testing the connection"
                : "Technical information about the OAuth failure"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm text-red-800 mb-2">Common causes:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  <li>Incorrect Client ID or Client Secret in Developer API settings</li>
                  <li>Client ID/Secret from a different Strava application</li>
                  <li>Strava application not properly configured</li>
                  <li>Authorization callback domain mismatch</li>
                  <li>Token expired or invalid</li>
                  <li>Not authenticated (check session status)</li>
                </ul>
              </div>

              <div className="border-t border-red-200 pt-3">
                <p className="font-medium text-sm text-red-800 mb-2">Technical Details:</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-xs text-red-800">Error Type:</p>
                    <p className="text-sm text-red-700">{(testError || errorDetails)?.error || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-xs text-red-800">Description:</p>
                    <p className="text-sm text-red-700">
                      {(testError || errorDetails)?.description || "No description available"}
                    </p>
                  </div>
                  {(testError || errorDetails)?.details && (
                    <div>
                      <p className="font-medium text-xs text-red-800">Details:</p>
                      <pre className="text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify((testError || errorDetails).details, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-xs text-red-800">Timestamp:</p>
                    <p className="text-sm text-red-700">{(testError || errorDetails)?.timestamp || "Unknown"}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {debugResults && (
        <Card className={debugResults.success ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
          <CardHeader>
            <CardTitle className={`${debugResults.success ? "text-green-800" : "text-orange-800"} flex items-center`}>
              <Info className="mr-2 h-4 w-4" />
              Debug Test Results
            </CardTitle>
            <CardDescription className={debugResults.success ? "text-green-700" : "text-orange-700"}>
              {debugResults.success
                ? "All connection components tested successfully"
                : `Failed at step: ${debugResults.step}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre
              className={`text-xs ${debugResults.success ? "text-green-700 bg-green-100" : "text-orange-700 bg-orange-100"} p-2 rounded overflow-auto max-h-64`}
            >
              {JSON.stringify(debugResults, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* OAuth Configuration Debug */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center justify-between">
            <div className="flex items-center">
              <Info className="mr-2 h-4 w-4" />
              OAuth Configuration Debug
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="h-6 text-xs text-blue-700"
            >
              {showDebugInfo ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Show Details
                </>
              )}
            </Button>
          </CardTitle>
          {!showDebugInfo && (
            <CardDescription className="text-blue-700">
              Your app is deployed at: <code>https://v0-strava-analyer.vercel.app</code>
              <br />
              Make sure your Strava app's Authorization Callback Domain is set to:{" "}
              <code>v0-strava-analyer.vercel.app</code>
            </CardDescription>
          )}
        </CardHeader>
        {showDebugInfo && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm text-blue-800">Current App URL:</p>
                <code className="block mt-1 p-2 bg-white rounded text-sm break-all">
                  https://v0-strava-analyer.vercel.app
                </code>
              </div>
              <div>
                <p className="font-medium text-sm text-blue-800">Expected Redirect URI:</p>
                <code className="block mt-1 p-2 bg-white rounded text-sm break-all">
                  https://v0-strava-analyer.vercel.app/api/auth/strava/callback
                </code>
              </div>
              <div>
                <p className="font-medium text-sm text-blue-800">Troubleshooting Steps:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1 text-sm text-blue-700">
                  <li>
                    Go to{" "}
                    <a
                      href="https://www.strava.com/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Strava API Settings
                    </a>
                  </li>
                  <li>
                    <strong>Double-check your Client ID and Client Secret</strong> - copy them exactly from Strava to
                    the Developer API tab
                  </li>
                  <li>
                    Verify the "Authorization Callback Domain" is set to:{" "}
                    <code className="bg-white px-1 rounded">v0-strava-analyer.vercel.app</code>
                  </li>
                  <li>Save changes in Strava and try connecting again</li>
                </ol>
              </div>
              {debugInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-blue-800">Full Debug Info</summary>
                  <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
