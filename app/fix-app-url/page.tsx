"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function FixAppUrlPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [customUrl, setCustomUrl] = useState("")

  // Detect the current URL
  const currentUrl = typeof window !== "undefined" ? window.location.origin : ""
  const expectedUrl = "https://v0-strava-analyer.vercel.app"

  const fixAppUrl = async (urlToSet?: string) => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/fix-app-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appUrl: urlToSet || expectedUrl,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update APP_URL",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkCurrentUrl = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/fix-app-url")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to check APP_URL",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fix APP_URL Configuration</h1>
        <p className="text-muted-foreground">
          Update the APP_URL setting in your database to match your deployment URL
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Environment</CardTitle>
            <CardDescription>Information about your current deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current URL (detected)</Label>
              <Input value={currentUrl} readOnly className="font-mono text-sm" />
            </div>
            <div>
              <Label>Expected Production URL</Label>
              <Input value={expectedUrl} readOnly className="font-mono text-sm" />
            </div>
            <div>
              <Label>Environment</Label>
              <Input
                value={currentUrl.includes("vercel.app") ? "Production/Preview" : "Development"}
                readOnly
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Check or update your APP_URL setting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkCurrentUrl} disabled={isLoading} className="w-full" variant="outline">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check Current APP_URL
            </Button>

            <Button onClick={() => fixAppUrl()} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set to Production URL
            </Button>

            <Button onClick={() => fixAppUrl(currentUrl)} disabled={isLoading} className="w-full" variant="secondary">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set to Current URL
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom URL</CardTitle>
          <CardDescription>Set a custom APP_URL if needed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="custom-url">Custom APP_URL</Label>
            <Input
              id="custom-url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://your-custom-domain.com"
              className="font-mono text-sm"
            />
          </div>
          <Button
            onClick={() => fixAppUrl(customUrl)}
            disabled={isLoading || !customUrl}
            className="w-full"
            variant="outline"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set Custom URL
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {result.success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="space-y-2">
                  <p>{result.message}</p>
                  {result.appUrl && (
                    <div>
                      <strong>APP_URL set to:</strong>
                      <code className="block mt-1 p-2 bg-white rounded text-sm">{result.appUrl}</code>
                    </div>
                  )}
                  {result.redirectUri && (
                    <div>
                      <strong>Redirect URI:</strong>
                      <code className="block mt-1 p-2 bg-white rounded text-sm">{result.redirectUri}</code>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}

          {result.currentAppUrl !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle>Current Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <strong>Current APP_URL in database:</strong>
                  <code className="block mt-1 p-2 bg-gray-100 rounded text-sm">
                    {result.currentAppUrl || "Not set"}
                  </code>
                </div>
                <div>
                  <strong>Expected URL:</strong>
                  <code className="block mt-1 p-2 bg-gray-100 rounded text-sm">{result.correctAppUrl}</code>
                </div>
                <div>
                  <strong>Needs Update:</strong>
                  <span className={result.needsUpdate ? "text-red-600" : "text-green-600"}>
                    {result.needsUpdate ? " Yes" : " No"}
                  </span>
                </div>
                {result.redirectUri && (
                  <div>
                    <strong>Redirect URI:</strong>
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-sm">{result.redirectUri}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Next Steps</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Update your APP_URL using one of the buttons above</li>
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
              Set the Authorization Callback Domain to: <code>v0-strava-analyer.vercel.app</code>
            </li>
            <li>
              Go back to{" "}
              <a href="/settings?tab=user" className="text-blue-600 underline">
                Settings → User Connection
              </a>{" "}
              and try connecting
            </li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  )
}
