"use client" // Make this a client component to avoid cookies error

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  email: string
  role: string
}

interface Stats {
  total_users: number
  new_users_30d: number
  total_activities: number
  active_subscriptions: number
}

interface PlanStats {
  plan_name: string
  plan_type: string
  user_count: number
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [usersByPlan, setUsersByPlan] = useState<PlanStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const userData = await response.json()
          if (userData.role !== "admin") {
            setError("Admin access required")
            router.push("/dashboard")
            return
          }
          setUser(userData)
          fetchAdminData()
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        setError("Authentication failed")
      }
    }

    checkAuth()
  }, [router])

  async function fetchAdminData() {
    try {
      // Fetch admin stats
      const statsResponse = await fetch("/api/admin/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats[0])
        setUsersByPlan(statsData.usersByPlan || [])
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
      setError("Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Error</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">+{stats?.new_users_30d || 0} in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_activities || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_subscriptions || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users by Plan</CardTitle>
          <CardDescription>Distribution of users across subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usersByPlan.length > 0 ? (
              usersByPlan.map((plan) => (
                <div key={plan.plan_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.plan_type === "free" ? "secondary" : "default"}>{plan.plan_name}</Badge>
                  </div>
                  <div className="text-sm font-medium">{plan.user_count} users</div>
                </div>
              ))
            ) : (
              <p>No plan data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
