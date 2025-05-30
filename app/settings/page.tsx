import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeveloperSettings } from "@/components/developer-settings"
import { GoogleDeveloperSettings } from "@/components/google-developer-settings"
import { ChatGPTDeveloperSettings } from "@/components/chatgpt-developer-settings"
import { UserConnection } from "@/components/user-connection"
import { GooglePhotosConnection } from "@/components/google-photos-connection"
import { getStravaSettings } from "@/lib/system-settings"
import { getStravaConnection } from "@/lib/strava-connection"
import { getGooglePhotosConnection, getGoogleSettings } from "@/lib/google-photos-actions"
import { getChatGPTSettings } from "@/lib/chatgpt-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SettingsPageProps {
  searchParams: { tab?: string; message?: string; error?: string; success?: string }
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const stravaSettings = await getStravaSettings()
  const stravaConnection = await getStravaConnection()
  const googleSettings = await getGoogleSettings()
  const googlePhotosConnection = await getGooglePhotosConnection()
  const chatgptSettings = await getChatGPTSettings()

  // Set default tab based on the URL parameter
  const defaultTab =
    searchParams.tab === "user"
      ? "user"
      : searchParams.tab === "google"
        ? "google"
        : searchParams.tab === "google-dev"
          ? "google-dev"
          : searchParams.tab === "chatgpt"
            ? "chatgpt"
            : "developer"

  // Handle messages
  const message = searchParams.message
  const error = searchParams.error
  const success = searchParams.success

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your integrations</p>
      </div>

      {message === "connect_required" && (
        <Alert>
          <AlertDescription>You need to connect your Strava account before you can import activities.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error === "auth_denied" && "Authentication was denied."}
            {error === "invalid_request" && "Invalid request parameters."}
            {error === "invalid_state" && "Security verification failed."}
            {error === "missing_credentials" && "API credentials are not configured."}
            {error === "token_exchange_failed" && "Failed to exchange authorization code for tokens."}
            {error === "user_info_failed" && "Failed to retrieve user information."}
            {error === "server_error" && "A server error occurred."}
            {![
              "auth_denied",
              "invalid_request",
              "invalid_state",
              "missing_credentials",
              "token_exchange_failed",
              "user_info_failed",
              "server_error",
            ].includes(error) && "An error occurred."}
          </AlertDescription>
        </Alert>
      )}

      {success === "true" && (
        <Alert>
          <AlertDescription>Connection successful!</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="developer">Strava API</TabsTrigger>
          <TabsTrigger value="user">Strava Connection</TabsTrigger>
          <TabsTrigger value="google-dev">Google API</TabsTrigger>
          <TabsTrigger value="google">Google Photos</TabsTrigger>
          <TabsTrigger value="chatgpt">ChatGPT API</TabsTrigger>
        </TabsList>

        <TabsContent value="developer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strava API Credentials</CardTitle>
              <CardDescription>Configure your Strava API application credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <DeveloperSettings initialSettings={stravaSettings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strava User Connection</CardTitle>
              <CardDescription>Connect your Strava account to import activities</CardDescription>
            </CardHeader>
            <CardContent>
              <UserConnection initialConnection={stravaConnection} apiConfigured={stravaSettings.isConfigured} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google-dev" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Photos API Credentials</CardTitle>
              <CardDescription>Configure your Google Photos API application credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleDeveloperSettings initialSettings={googleSettings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Photos Integration</CardTitle>
              <CardDescription>Connect your Google Photos account to match photos with activities</CardDescription>
            </CardHeader>
            <CardContent>
              <GooglePhotosConnection
                initialConnection={googlePhotosConnection}
                apiConfigured={googleSettings.isConfigured}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chatgpt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ChatGPT API Integration</CardTitle>
              <CardDescription>Configure OpenAI API access for AI-powered activity analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <ChatGPTDeveloperSettings initialSettings={chatgptSettings} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
