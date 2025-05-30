"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface TestResult {
  success: boolean
  message?: string
  error?: string
  results?: any
  troubleshooting?: any
}

export default function TestDatabasePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const runTest = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-database")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to run test",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Connection Test</h1>
        <p className="text-muted-foreground">
          Test your Neon database connection and verify the schema is properly set up
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Verification</CardTitle>
          <CardDescription>
            This will test the database connection, verify all tables exist, and check permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runTest} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Testing Database..." : "Run Database Test"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {result.success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Database Test Successful</AlertTitle>
              <AlertDescription className="text-green-700">{result.message}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Database Test Failed</AlertTitle>
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}

          {result.results && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Connection Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Connection Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <Badge variant="default">{result.results.connection.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database:</span>
                    <span className="text-sm">{result.results.connection.database_version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Timestamp:</span>
                    <span className="text-sm">{new Date(result.results.connection.timestamp).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tables Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tables</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>All Present:</span>
                    <Badge variant={result.results.tables.all_present ? "default" : "destructive"}>
                      {result.results.tables.all_present ? "✅ Yes" : "❌ No"}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <div>Expected: {result.results.tables.expected.length}</div>
                    <div>Found: {result.results.tables.existing.length}</div>
                    <div className="mt-1">
                      {result.results.tables.existing.map((table: string) => (
                        <Badge key={table} variant="outline" className="mr-1 mb-1">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Demo User */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Demo User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Exists:</span>
                    <Badge variant={result.results.demo_user.exists ? "default" : "destructive"}>
                      {result.results.demo_user.exists ? "✅ Yes" : "❌ No"}
                    </Badge>
                  </div>
                  {result.results.demo_user.data && (
                    <div className="text-sm space-y-1">
                      <div>ID: {result.results.demo_user.data.id}</div>
                      <div>Email: {result.results.demo_user.data.email}</div>
                      <div>Name: {result.results.demo_user.data.name}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Activities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Count:</span>
                    <Badge variant="outline">{result.results.activities.count}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Total Distance: {(result.results.activities.stats.total_distance / 1000).toFixed(1)} km</div>
                    <div>Total Duration: {Math.floor(result.results.activities.stats.total_duration / 3600)} hours</div>
                    <div>Total Elevation: {result.results.activities.stats.total_elevation.toFixed(0)} m</div>
                  </div>
                </CardContent>
              </Card>

              {/* Environment Variables */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Environment Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(result.results.environment_variables).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{key}:</span>
                        <Badge variant={value ? "default" : "destructive"}>{value ? "✅" : "❌"}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {result.troubleshooting && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Troubleshooting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(result.troubleshooting).map(
                  ([issue, suggestions]) =>
                    suggestions && (
                      <div key={issue}>
                        <h4 className="font-medium capitalize mb-2">{issue.replace(/_/g, " ")}:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {(suggestions as string[]).map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
