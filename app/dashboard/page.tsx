"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  username: string
  email: string
  role: string
  password_set?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated) {
            setUser(data.user)

            // If password is not set, redirect to set password page
            if (data.user && data.user.password_set === false) {
              router.push("/set-password")
            }
          } else {
            router.push("/login")
          }
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Strava Analyzer</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.username} ({user?.role})
            </span>
            <Button onClick={() => router.push("/change-password")} variant="outline" size="sm">
              Change Password
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <p className="text-gray-600 mb-2">Welcome to your Strava activity analyzer</p>
          <p className="text-sm text-gray-500">
            Logged in as: {user?.email} ({user?.role})
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900">Settings</h2>
              <p className="text-blue-700 mt-1">Connect your Strava account and configure settings.</p>
              <a
                href="/settings"
                className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Settings
              </a>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-900">Activities</h2>
              <p className="text-green-700 mt-1">View and analyze your imported activities.</p>
              <a
                href="/activities-client"
                className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                View Activities
              </a>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-purple-900">Import Data</h2>
              <p className="text-purple-700 mt-1">Import your Strava activities and data.</p>
              <a
                href="/import"
                className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Import Activities
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
