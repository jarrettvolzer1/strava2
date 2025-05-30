"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

// Dynamically import the dashboard with no SSR
const DashboardClient = dynamic(() => import("@/components/dashboard-client"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p>Loading dashboard...</p>
      </div>
    </div>
  ),
})

export default function DashboardWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  )
}
