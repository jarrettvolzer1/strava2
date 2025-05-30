"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { saveStravaSettings } from "@/lib/actions"

interface SetupFormProps {
  initialSettings: {
    clientId: string | null
    clientSecret: string | null
    webhookVerifyToken: string | null
    appUrl: string | null
    isConfigured: boolean
  }
}

export function SetupForm({ initialSettings }: SetupFormProps) {
  const { toast } = useToast()
  const [clientId, setClientId] = useState(initialSettings.clientId || "")
  const [clientSecret, setClientSecret] = useState(initialSettings.clientSecret || "")
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
      await saveStravaSettings({
        clientId,
        clientSecret,
        webhookVerifyToken,
        appUrl,
      })

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
        <p className="text-sm text-muted-foreground">You can find this in your Strava API application settings</p>
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
        <Label htmlFor="webhook-token">Webhook Verify Token</Label>
        <Input
          id="webhook-token"
          value={webhookVerifyToken}
          onChange={(e) => setWebhookVerifyToken(e.target.value)}
          placeholder="Enter a verify token for Strava webhooks"
        />
        <p className="text-sm text-muted-foreground">Optional: Used for verifying Strava webhook subscriptions</p>
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

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </div>
  )
}
