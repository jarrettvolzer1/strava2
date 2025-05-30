"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DeveloperSettingsProps {
  initialSettings: {
    clientId: string | null
    clientSecret: string | null
    webhookVerifyToken: string | null
    appUrl: string | null
    accessToken: string | null
    refreshToken: string | null
    isConfigured: boolean
  }
}

export function DeveloperSettings({ initialSettings }: DeveloperSettingsProps) {
  const { toast } = useToast()
  const [clientId, setClientId] = useState(initialSettings.clientId || "")
  const [clientSecret, setClientSecret] = useState(initialSettings.clientSecret || "")
  const [accessToken, setAccessToken] = useState(initialSettings.accessToken || "")
  const [refreshToken, setRefreshToken] = useState(initialSettings.refreshToken || "")
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(initialSettings.webhookVerifyToken || "")
  const [appUrl, setAppUrl] = useState(initialSettings.appUrl || "")
  const [isSaving, setIsSaving] = useState(false)

  // Set the app URL using window.location.origin only on the client side
  useEffect(() => {
    if (!appUrl && typeof window !== "undefined") {
      setAppUrl(window.location.origin)
    }
  }, [appUrl])

  const handleSave = async () => {
    if (!clientId || !clientSecret || !appUrl) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/auth/strava/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          webhookVerifyToken,
          appUrl,
          accessToken: accessToken || undefined,
          refreshToken: refreshToken || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings")
      }

      toast({
        title: "Settings saved",
        description: "Your Strava API settings have been saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Developer API Setup</AlertTitle>
        <AlertDescription>
          These credentials are from your Strava API Application. You can find them at{" "}
          <a
            href="https://www.strava.com/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            https://www.strava.com/settings/api
          </a>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="client-id">
          Client ID <span className="text-red-500">*</span>
        </Label>
        <Input
          id="client-id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Enter your Strava Client ID"
        />
        <p className="text-sm text-muted-foreground">The numeric ID for your Strava API application</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client-secret">
          Client Secret <span className="text-red-500">*</span>
        </Label>
        <Input
          id="client-secret"
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="Enter your Strava Client Secret"
        />
        <p className="text-sm text-muted-foreground">The secret key for your Strava API application</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="access-token">Access Token (Optional)</Label>
        <Input
          id="access-token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Enter your Strava Access Token"
        />
        <p className="text-sm text-muted-foreground">
          Optional: You can provide an initial access token from your Strava API page
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="refresh-token">Refresh Token (Optional)</Label>
        <Input
          id="refresh-token"
          value={refreshToken}
          onChange={(e) => setRefreshToken(e.target.value)}
          placeholder="Enter your Strava Refresh Token"
        />
        <p className="text-sm text-muted-foreground">
          Optional: You can provide an initial refresh token from your Strava API page
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="app-url">
          Application URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="app-url"
          value={appUrl}
          onChange={(e) => setAppUrl(e.target.value)}
          placeholder="https://your-app-url.com"
        />
        <p className="text-sm text-muted-foreground">
          The base URL of your application (e.g., https://your-app.vercel.app)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhook-token">Webhook Verify Token (Optional)</Label>
        <Input
          id="webhook-token"
          value={webhookVerifyToken}
          onChange={(e) => setWebhookVerifyToken(e.target.value)}
          placeholder="Enter a verify token for Strava webhooks"
        />
        <p className="text-sm text-muted-foreground">Used for verifying Strava webhook subscriptions</p>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save API Settings
      </Button>

      {initialSettings.isConfigured && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>API credentials are configured</span>
        </div>
      )}
    </div>
  )
}
