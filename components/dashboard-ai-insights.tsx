"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Loader2, TrendingUp, Calendar, Target, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateDashboardInsights } from "@/lib/chatgpt-actions"

interface DashboardAIInsightsProps {
  recentActivities: Array<{
    id: number
    name: string
    type: string
    distance: number
    elapsed_time: number
    start_date: string
  }>
  stats: {
    totalActivities: number
    totalDistance: number
    totalDuration: number
    totalElevation: number
  }
}

export function DashboardAIInsights({ recentActivities, stats }: DashboardAIInsightsProps) {
  const [insights, setInsights] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const { toast } = useToast()

  const handleGenerateInsights = async () => {
    setIsGenerating(true)
    try {
      const result = await generateDashboardInsights({
        recentActivities,
        stats,
      })

      setInsights(result.insights)
      setLastGenerated(new Date())

      toast({
        title: "Insights generated",
        description: "AI has analyzed your recent activity patterns",
      })
    } catch (error) {
      toast({
        title: "Failed to generate insights",
        description: error instanceof Error ? error.message : "Failed to generate insights",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const formatInsights = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim())

    return (
      <div className="space-y-3">
        {lines.map((line, index) => {
          if (line.includes("🎯") || line.includes("Target") || line.includes("Goal")) {
            return (
              <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{line.replace(/🎯|Target:|Goal:/, "").trim()}</p>
              </div>
            )
          }
          if (line.includes("📈") || line.includes("Trend") || line.includes("Progress")) {
            return (
              <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{line.replace(/📈|Trend:|Progress:/, "").trim()}</p>
              </div>
            )
          }
          if (line.includes("⚡") || line.includes("Quick") || line.includes("Tip")) {
            return (
              <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{line.replace(/⚡|Quick:|Tip:/, "").trim()}</p>
              </div>
            )
          }
          return (
            <p key={index} className="text-sm text-muted-foreground">
              {line}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Training Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastGenerated && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {lastGenerated.toLocaleDateString()}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleGenerateInsights} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!insights ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Get personalized insights about your training patterns, progress trends, and recommendations for
              improvement.
            </p>
            <Button onClick={handleGenerateInsights} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing your data...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        ) : (
          formatInsights(insights)
        )}
      </CardContent>
    </Card>
  )
}
