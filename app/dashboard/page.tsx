"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardWrapper from "@/components/dashboard-wrapper"

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated) {
            setIsAuthenticated(true)
          } else {
            console.log("Not authenticated, redirecting to login")
            router.push("/login")
          }
        } else {
          console.log("Auth check failed, redirecting to login")
          router.push("/login")
        }
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Checking authentication...</div>
      </div>
    )
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirecting to login...</div>
      </div>
    )
  }

  return <DashboardWrapper />
}
