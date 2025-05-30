import { getStravaSettings } from "@/lib/system-settings"
import { SetupForm } from "@/components/setup-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SetupPage() {
  const settings = await getStravaSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setup</h1>
        <p className="text-muted-foreground">Configure your Strava API credentials</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strava API Configuration</CardTitle>
          <CardDescription>Enter your Strava API credentials to enable integration with the Strava API</CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  )
}
