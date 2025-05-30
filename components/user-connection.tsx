"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, Loader2, ExternalLink } from "lucide-react"
import { connectStrava, disconnectStrava, testStravaConnection } from "@/lib/actions"
import { useSearchParams, useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface UserConnectionProps {
  initialConnection: any | null
  apiConfigured: boolean
}

export function UserConnection({ initialConnection, apiConfigured }: UserConnectionProps) {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(!!initialConnection)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error" | null>(
    initialConnection ? "connected" : "disconnected",
  )
  const [athleteInfo, setAthleteInfo] = useState<any>(null)
  const [isMockData, setIsMockData] = useState(initialConnection?.athlete_id === 12345678)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(true) // Always show debug by default

  // Fetch debug info on component mount
  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const response = await fetch("/api/debug/oauth")
        const data = await response.json()
        setDebugInfo(data)
        console.log("Debug info fetched:", data)
      } catch (error) {
        console.error("Failed to fetch debug info:", error)
      }
    }
    fetchDebugInfo()
  }, [])

  // Handle OAuth callback results
  useEffect(() => {
    const error = searchParams.get("error")
    const success = searchParams.get("success")
    const details = searchParams.get("details")

    // Clear URL parameters after processing them
    const clearParams = () => {
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      url.searchParams.delete("success")
      url.searchParams.delete("details")
      url.searchParams.set("tab", "user") // Keep the tab parameter
      router.replace(url.pathname + url.search)
    }

    if (error) {
      let errorMessage = "Failed to connect to Strava. Please try again."
      let detailedError = null

      if (details) {
        try {
          const parsedDetails = JSON.parse(decodeURIComponent(details))
          detailedError = parsedDetails
          setErrorDetails(JSON.stringify(parsedDetails, null, 2))

          // Create a more user-friendly error message
          if (error === "token_exchange") {
            if (parsedDetails.error?.message === "Authorization Error") {
              errorMessage =
                "Invalid Strava API credentials. Please check your Client ID and Client Secret in the Developer API tab."
            } else if (parsedDetails.error?.errors) {
              const errorCodes = parsedDetails.error.errors.map((e: any) => e.code).join(", ")
              errorMessage = `Strava API error: ${errorCodes}. Please verify your API credentials.`
            } else {
              errorMessage = `Token exchange failed: ${parsedDetails.message || "Unknown error"}`
            }
          }
        } catch (e) {
          console.error("Failed to parse error details:", e)
        }
      }

      toast({
        title: `Connection failed: ${error}`,
        description: errorMessage,
        variant: "destructive",
      })

      // Clear params after showing toast
      setTimeout(clearParams, 500)
    } else if (success) {
      toast({
        title: "Connected to Strava",
        description: "Your Strava account has been successfully connected.",
      })
      setIsConnected(true)
      setConnectionStatus("connected")
      setIsMockData(false)
      setErrorDetails(null)

      // Clear params after showing toast
      setTimeout(clearParams, 500)
    }
  }, [searchParams, toast, router])

  const handleConnect = async () => {
    try {
      const { authUrl } = await connectStrava()
      // Redirect to Strava authorization page
      if (typeof window !== "undefined") {
        window.location.href = authUrl
      }
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
      setIsMockData(false)
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

  if (!apiConfigured) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>API Not Configured</AlertTitle>
        <AlertDescription>
          Please configure your Strava API credentials in the Developer API tab before connecting a user account.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Strava OAuth Authentication</AlertTitle>
        <AlertDescription>
          To connect your real Strava account, you need to authorize this application through Strava's OAuth flow. Click
          the "Connect to Strava" button below to start the authorization process.
        </AlertDescription>
      </Alert>

      {errorDetails && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>OAuth Error Details</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>Common causes:</strong>
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Incorrect Client ID or Client Secret in Developer API settings</li>
                <li>Client ID/Secret from a different Strava application</li>
                <li>Strava application not properly configured</li>
                <li>Authorization callback domain mismatch</li>
              </ul>
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <pre className="mt-2 w-full overflow-auto rounded-md bg-slate-950 p-4 text-xs text-white">
                  {errorDetails}
                </pre>
              </details>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isMockData && isConnected && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Mock Connection Detected</AlertTitle>
          <AlertDescription>
            You're currently using a mock connection. To use your real Strava data, please disconnect and then connect
            with your actual Strava account.
          </AlertDescription>
        </Alert>
      )}

      {/* OAuth Configuration Debug - Always show this */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertTitle className="flex items-center justify-between">
          OAuth Configuration Debug
          <Button variant="ghost" size="sm" onClick={() => setShowDebug(!showDebug)} className="h-6 text-xs">
            {showDebug ? "Hide" : "Show"} Details
          </Button>
        </AlertTitle>
        <AlertDescription>
          {showDebug && debugInfo ? (
            <div className="mt-2 space-y-2">
              <div>
                <strong>Current App URL:</strong>
                <code className="block mt-1 p-2 bg-white rounded text-sm break-all">
                  https://v0-strava-analyer.vercel.app
                </code>
              </div>
              <div>
                <strong>Expected Redirect URI:</strong>
                <code className="block mt-1 p-2 bg-white rounded text-sm break-all">
                  https://v0-strava-analyer.vercel.app/api/auth/strava/callback
                </code>
              </div>
              <div>
                <strong>Troubleshooting Steps:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
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
                  <summary className="cursor-pointer text-sm font-medium">Full Debug Info</summary>
                  <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <div>
              <p>
                Your app is deployed at: <code>https://v0-strava-analyer.vercel.app</code>
              </p>
              <p className="mt-1">
                Make sure your Strava app's Authorization Callback Domain is set to:{" "}
                <code>v0-strava-analyer.vercel.app</code>
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {!isConnected ? (
        <div className="space-y-4">
          <Button onClick={handleConnect} className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Connect to Strava
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>
              Clicking the button above will redirect you to Strava's website where you can authorize this application
              to access your activities. After authorization, you'll be redirected back to this page.
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
                    ? `Athlete ID: ${initialConnection.athlete_id}${
                        initialConnection.athlete_id === 12345678 ? " (Mock Data)" : ""
                      }`
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
            <p>
              {isMockData
                ? "You're using a mock connection. Disconnect and connect with your real Strava account to import your actual activities."
                : "Your Strava account is connected. You can now import your activities."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
