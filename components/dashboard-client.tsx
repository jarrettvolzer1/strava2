"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import AppWrapper from "@/components/app-wrapper"
import { ActivityStats } from "@/components/activity-stats"
import { RecentActivities } from "@/components/recent-activities"
import { DashboardAIInsights } from "@/components/dashboard-ai-insights"

export default function DashboardClient() {
  const sessionResult = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Safely destructure session
  const session = sessionResult?.data || null
  const status = sessionResult?.status || "loading"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    try {
      if (!mounted) return

      console.log("Dashboard - Session result:", sessionResult)
      console.log("Dashboard - Session status:", status)
      console.log("Dashboard - Session data:", session)

      if (status === "loading") {
        console.log("Session still loading...")
        return
      }

      if (status === "unauthenticated") {
        console.log("User not authenticated, redirecting to login...")
        router.push("/login")
        return
      }

      if (status === "authenticated" && session?.user) {
        console.log("User authenticated successfully:", session.user)
      }
    } catch (err) {
      console.error("Error in dashboard useEffect:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }, [sessionResult, session, status, router, mounted])

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Show error if any
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <p className="text-sm text-gray-500 mt-1">Session result: {JSON.stringify(sessionResult)}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // Show loading while session is being determined
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p>Loading session...</p>
          <p className="text-xs text-gray-500">Status: {status}</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated
  if (status !== "authenticated" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Redirecting to login...</p>
          <p className="text-xs text-gray-500 mt-1">Status: {status}</p>
        </div>
      </div>
    )
  }

  // Full dashboard with all components restored
  return (
    <ErrorBoundary>
      <AppWrapper>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your Strava activity analyzer</p>
            <p className="text-sm text-muted-foreground mt-1">
              Logged in as: {session.user?.email} ({session.user?.role || "user"})
            </p>
          </div>

          <ActivityStats />

          <div className="grid gap-6 md:grid-cols-2">
            <RecentActivities />
            <DashboardAIInsights />
          </div>
        </div>
      </AppWrapper>
    </ErrorBoundary>
  )
}
