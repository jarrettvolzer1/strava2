"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { saveGoogleSettings } from "@/lib/google-photos-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface GoogleDeveloperSettingsProps {
  initialSettings: {
    clientId: string | null
    clientSecret: string | null
    isConfigured: boolean
  }
}

export function GoogleDeveloperSettings({ initialSettings }: GoogleDeveloperSettingsProps) {
  const { toast } = useToast()
  const [clientId, setClientId] = useState(initialSettings.clientId || "")
  const [clientSecret, setClientSecret] = useState(initialSettings.clientSecret || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      await saveGoogleSettings({
        clientId,
        clientSecret,
      })

      toast({
        title: "Settings saved",
        description: "Your Google Photos API settings have been saved successfully",
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
        <AlertTitle>Google Photos API Setup</AlertTitle>
        <AlertDescription>
          These credentials are from your Google Cloud Console. You can create a project and enable the Google Photos
          Library API at{" "}
          <a
            href="https://console.cloud.google.com/apis/library/photoslibrary.googleapis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Google Cloud Console
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
          placeholder="Enter your Google Photos Client ID"
        />
        <p className="text-sm text-muted-foreground">
          The OAuth 2.0 Client ID for your Google Cloud project (ends with .apps.googleusercontent.com)
        </p>
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
          placeholder="Enter your Google Photos Client Secret"
        />
        <p className="text-sm text-muted-foreground">The secret key for your Google Cloud OAuth 2.0 Client</p>
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
