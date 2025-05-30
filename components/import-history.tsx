"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { getImportLogs } from "@/lib/actions"

interface ImportLog {
  id: number
  start_date: string
  end_date: string
  activities_count: number
  status: "completed" | "failed" | "in_progress"
  error_message?: string
  created_at: string
}

export function ImportHistory() {
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const importLogs = await getImportLogs()
        setLogs(importLogs)
      } catch (error) {
        console.error("Failed to fetch import logs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading import history...</p>
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No import history found.</p>
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="border rounded-md p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium">
                {/* Show date and time for created_at */}
                {format(new Date(log.created_at), "PPP 'at' h:mm a")}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(log.start_date), "PP")} - {format(new Date(log.end_date), "PP")}
              </p>
            </div>
            <Badge
              variant={
                log.status === "completed" ? "default" : log.status === "in_progress" ? "outline" : "destructive"
              }
            >
              {log.status}
            </Badge>
          </div>
          <p className="text-sm">{log.activities_count} activities imported</p>
          {log.error_message && <p className="text-sm text-red-500 mt-2">{log.error_message}</p>}
        </div>
      ))}
    </div>
  )
}
