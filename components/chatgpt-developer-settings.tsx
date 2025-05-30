"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { saveChatGPTSettings } from "@/lib/chatgpt-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ChatGPTDeveloperSettingsProps {
  initialSettings: {
    apiKey: string | null
    organizationId: string | null
    isConfigured: boolean
    model: string | null
  }
}

export function ChatGPTDeveloperSettings({ initialSettings }: ChatGPTDeveloperSettingsProps) {
  const { toast } = useToast()
  const [apiKey, setApiKey] = useState(initialSettings.apiKey || "")
  const [organizationId, setOrganizationId] = useState(initialSettings.organizationId || "")
  const [isSaving, setIsSaving] = useState(false)
  const [selectedModel, setSelectedModel] = useState(initialSettings.model || "gpt-4o-mini")
  const [usageStats, setUsageStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    sessionsToday: 0,
  })

  const handleSave = async () => {
    if (!apiKey) {
      toast({
        title: "Missing API Key",
        description: "Please enter your OpenAI API key",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      await saveChatGPTSettings({
        apiKey,
        organizationId: organizationId || undefined,
        model: selectedModel,
      })

      toast({
        title: "Settings saved",
        description: "Your ChatGPT API settings have been saved successfully",
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
        <AlertTitle>OpenAI API Setup</AlertTitle>
        <AlertDescription>
          These credentials are from your OpenAI account. Follow the instructions below to get your API key.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            How to Get Your OpenAI API Key
          </CardTitle>
          <CardDescription>Follow these steps to obtain your API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Create an OpenAI Account</p>
                <p className="text-sm text-muted-foreground">
                  Go to{" "}
                  <a
                    href="https://platform.openai.com/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com/signup
                  </a>{" "}
                  and create an account if you don't have one.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Add Payment Method</p>
                <p className="text-sm text-muted-foreground">
                  Add a payment method to your account at{" "}
                  <a
                    href="https://platform.openai.com/account/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com/account/billing
                  </a>
                  . This is required to use the API.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Generate API Key</p>
                <p className="text-sm text-muted-foreground">
                  Go to{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com/api-keys
                  </a>{" "}
                  and click "Create new secret key". Give it a name like "Strava Analyzer" and copy the key.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Find Organization ID (Optional)</p>
                <p className="text-sm text-muted-foreground">
                  If you're part of an organization, you can find your Organization ID at{" "}
                  <a
                    href="https://platform.openai.com/account/org-settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com/account/org-settings
                  </a>
                  . This is optional for personal accounts.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> API usage is charged by OpenAI. The AI analytics feature will use GPT-4 which
              costs approximately $0.03 per 1K tokens. A typical activity analysis uses 500-1000 tokens (~$0.015-$0.03
              per analysis).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">
            OpenAI API Key <span className="text-red-500">*</span>
          </Label>
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
          <p className="text-sm text-muted-foreground">
            Your OpenAI API key (starts with "sk-"). This will be stored securely and used for AI analytics.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization-id">Organization ID (Optional)</Label>
          <Input
            id="organization-id"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            placeholder="org-..."
          />
          <p className="text-sm text-muted-foreground">
            Your OpenAI Organization ID (starts with "org-"). Only required if you're part of an organization.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-select">AI Model</Label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
          <p className="text-sm text-muted-foreground">
            Choose the AI model for activity analysis. GPT-4o Mini offers the best value for most use cases.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Pricing</CardTitle>
            <CardDescription>Cost per 1,000 tokens (approximate)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-medium">Model</div>
              <div className="font-medium">Input</div>
              <div className="font-medium">Output</div>

              <div>GPT-4o Mini</div>
              <div className="text-green-600">$0.00015</div>
              <div className="text-green-600">$0.0006</div>

              <div>GPT-4o</div>
              <div className="text-yellow-600">$0.0025</div>
              <div className="text-yellow-600">$0.01</div>

              <div>GPT-4 Turbo</div>
              <div className="text-red-600">$0.01</div>
              <div className="text-red-600">$0.03</div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Typical usage:</strong> Activity analysis uses 500-1000 tokens (~$0.001-$0.003 per query with
                GPT-4o Mini)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Statistics</CardTitle>
            <CardDescription>Your current API usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{usageStats.totalTokens.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Tokens Used</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">${usageStats.totalCost.toFixed(4)}</div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Sessions today: {usageStats.sessionsToday}</div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save API Settings
        </Button>

        {initialSettings.isConfigured && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>ChatGPT API credentials are configured</span>
          </div>
        )}
      </div>
    </div>
  )
}
