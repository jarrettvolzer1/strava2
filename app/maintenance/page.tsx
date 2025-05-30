import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Maintenance Mode</CardTitle>
          <CardDescription>
            We're currently performing maintenance on the system. Please check back later.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600">We apologize for any inconvenience and appreciate your patience.</p>
        </CardContent>
      </Card>
    </div>
  )
}
