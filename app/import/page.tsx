import { ActivityImportForm } from "@/components/activity-import-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImportHistory } from "@/components/import-history"
import { getStravaConnection } from "@/lib/strava-connection"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ImportPage() {
  let connection = null
  let connectionError = false

  try {
    connection = await getStravaConnection()
    console.log("Import page - connection check result:", {
      hasConnection: !!connection,
      isError: connection?.error,
      athleteId: connection?.athlete_id,
    })

    // If we have a connection but athlete_id is 0 (placeholder), try to update it
    if (connection && !connection.error && connection.athlete_id === 0) {
      try {
        console.log("Found placeholder athlete_id, attempting to fetch real athlete profile...")
        const { testStravaConnection } = await import("@/lib/actions")
        const testResult = await testStravaConnection()

        if (testResult.success) {
          // Re-fetch the connection to get the updated athlete_id
          connection = await getStravaConnection()
          console.log("Updated connection after test:", {
            athleteId: connection?.athlete_id,
            profile: testResult.profile?.firstname + " " + testResult.profile?.lastname,
          })
        }
      } catch (testError) {
        console.error("Failed to test/update connection:", testError)
        // Continue with the existing connection even if test fails
      }
    }
  } catch (error) {
    console.error("Error checking Strava connection:", error)
    connectionError = true
  }

  // Check if we have a real connection (not an error object and not null)
  const hasValidConnection = connection && !connection.error && connection.athlete_id && connection.athlete_id !== 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Activities</h1>
        <p className="text-muted-foreground">Import your Strava activities by date range</p>
      </div>

      {/* Show connection status */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Connection Error</AlertTitle>
          <AlertDescription>
            Unable to check your Strava connection status due to a database error. You can still try to import
            activities, but you may need to connect to Strava first.
          </AlertDescription>
        </Alert>
      )}

      {!connectionError && !hasValidConnection && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Strava Connection Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="space-y-3">
              <p>You need to connect your Strava account before importing activities.</p>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href="/settings?tab=user">
                    <Settings className="mr-2 h-4 w-4" />
                    Connect to Strava
                  </Link>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasValidConnection && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Strava Connected</AlertTitle>
          <AlertDescription className="text-green-700">
            Your Strava account is connected (Athlete ID: {connection.athlete_id}). You can now import activities.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import Activities</CardTitle>
            <CardDescription>
              {hasValidConnection
                ? "Select a date range to import activities"
                : "Connect to Strava first, then select a date range to import activities"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityImportForm disabled={!hasValidConnection} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>Recent activity imports</CardDescription>
          </CardHeader>
          <CardContent>
            <ImportHistory />
          </CardContent>
        </Card>
      </div>

      {/* Debug information */}
      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(
                {
                  connectionError,
                  hasConnection: !!connection,
                  hasValidConnection,
                  connectionData: connection
                    ? {
                        hasError: !!connection.error,
                        athleteId: connection.athlete_id,
                        hasAccessToken: !!connection.access_token,
                        isPlaceholder: connection.athlete_id === 0,
                      }
                    : null,
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
