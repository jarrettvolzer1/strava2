"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Brain, Sparkles, TrendingUp, Target, Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { analyzeActivity } from "@/lib/chatgpt-actions"

interface ActivityAIAnalysisProps {
  activity: {
    id: number
    name: string
    type: string
    distance: number
    elapsed_time: number
    total_elevation_gain: number
    average_speed: number
    max_speed: number
    start_date: string
  }
}

export function ActivityAIAnalysis({ activity }: ActivityAIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [tokensUsed, setTokensUsed] = useState<number>(0)
  const { toast } = useToast()

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const result = await analyzeActivity({
        name: activity.name,
        type: activity.type,
        distance: activity.distance,
        duration: activity.elapsed_time,
        elevationGain: activity.total_elevation_gain,
        averageSpeed: activity.average_speed,
        maxSpeed: activity.max_speed,
        startDate: activity.start_date,
      })

      setAnalysis(result.analysis)
      setTokensUsed(result.tokensUsed)

      toast({
        title: "Analysis complete",
        description: `AI analysis generated using ${result.tokensUsed} tokens`,
      })
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze activity",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatAnalysis = (text: string) => {
    // Split by numbered sections and format nicely
    const sections = text.split(/\d+\.\s+/).filter(Boolean)
    const intro = text.split(/1\.\s+/)[0]

    return (
      <div className="space-y-4">
        {intro && <p className="text-muted-foreground">{intro.trim()}</p>}
        {sections.map((section, index) => {
          const [title, ...content] = section.split(/[:\n]/)
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                {index === 0 && <TrendingUp className="h-4 w-4 text-blue-500" />}
                {index === 1 && <Target className="h-4 w-4 text-green-500" />}
                {index === 2 && <Brain className="h-4 w-4 text-purple-500" />}
                {index === 3 && <Sparkles className="h-4 w-4 text-orange-500" />}
                {index === 4 && <Award className="h-4 w-4 text-yellow-500" />}
                <h4 className="font-semibold">{title.trim()}</h4>
              </div>
              <p className="text-sm text-muted-foreground pl-6">{content.join(":").trim()}</p>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Performance Analysis
          {tokensUsed > 0 && (
            <Badge variant="secondary" className="text-xs">
              {tokensUsed} tokens
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <div className="text-center py-6">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Get AI-powered insights about your performance, training recommendations, and areas for improvement.
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Performance
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {formatAnalysis(analysis)}
            <div className="pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3 w-3" />
                )}
                Re-analyze
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
