"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Loader2, BarChart3, TrendingUp, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { compareActivities } from "@/lib/chatgpt-actions"

interface Activity {
  id: number
  name: string
  type: string
  distance: number
  elapsed_time: number
  total_elevation_gain: number
  average_speed: number
  start_date: string
}

interface ActivityComparisonAIProps {
  activities: Activity[]
}

export function ActivityComparisonAI({ activities }: ActivityComparisonAIProps) {
  const [comparison, setComparison] = useState<string | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const { toast } = useToast()

  const handleCompare = async () => {
    if (activities.length < 2) {
      toast({
        title: "Need more activities",
        description: "Select at least 2 activities to compare",
        variant: "destructive",
      })
      return
    }

    setIsComparing(true)
    try {
      const result = await compareActivities(activities)
      setComparison(result.comparison)

      toast({
        title: "Comparison complete",
        description: `AI analyzed ${activities.length} activities`,
      })
    } catch (error) {
      toast({
        title: "Comparison failed",
        description: error instanceof Error ? error.message : "Failed to compare activities",
        variant: "destructive",
      })
    } finally {
      setIsComparing(false)
    }
  }

  const formatComparison = (text: string) => {
    const sections = text.split(/(?=\*\*|\d+\.)/g).filter(Boolean)

    return (
      <div className="space-y-4">
        {sections.map((section, index) => {
          if (section.includes("Performance") || section.includes("Speed") || section.includes("Pace")) {
            return (
              <div key={index} className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <h4 className="font-semibold text-blue-700">Performance Analysis</h4>
                </div>
                <p className="text-sm">{section.replace(/\*\*|\d+\./, "").trim()}</p>
              </div>
            )
          }
          if (section.includes("Trend") || section.includes("Progress") || section.includes("Improvement")) {
            return (
              <div key={index} className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-green-500" />
                  <h4 className="font-semibold text-green-700">Trends & Progress</h4>
                </div>
                <p className="text-sm">{section.replace(/\*\*|\d+\./, "").trim()}</p>
              </div>
            )
          }
          return (
            <p key={index} className="text-sm text-muted-foreground">
              {section.replace(/\*\*|\d+\./, "").trim()}
            </p>
          )
        })}
      </div>
    )
  }

  if (activities.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Activity Comparison
          <Badge variant="secondary">{activities.length} activities</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!comparison ? (
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Compare selected activities to identify patterns, improvements, and training insights.
            </p>
            <Button onClick={handleCompare} disabled={isComparing || activities.length < 2}>
              {isComparing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Compare Activities
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {formatComparison(comparison)}
            <div className="pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleCompare} disabled={isComparing}>
                {isComparing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Brain className="mr-2 h-3 w-3" />}
                Re-analyze
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
