"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { getStravaConnectionStatus } from "@/lib/actions"

export function StravaConnectionStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "error" | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const connectionStatus = await getStravaConnectionStatus()
        setStatus(connectionStatus.status)
      } catch (error) {
        setStatus("error")
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [])

  if (isLoading) {
    return null
  }

  return (
    <Badge variant={status === "connected" ? "default" : status === "disconnected" ? "outline" : "destructive"}>
      {status === "connected"
        ? "Strava Connected"
        : status === "disconnected"
          ? "Strava Disconnected"
          : "Connection Error"}
    </Badge>
  )
}
