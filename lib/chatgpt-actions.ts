"use server"

import { neon } from "@neondatabase/serverless"
import { getSystemSetting, setSystemSetting } from "./system-settings"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

export async function getChatGPTSettings() {
  try {
    const apiKey = await getSystemSetting("CHATGPT_API_KEY")
    const organizationId = await getSystemSetting("CHATGPT_ORGANIZATION_ID")
    const model = await getSystemSetting("CHATGPT_MODEL")

    return {
      apiKey,
      organizationId,
      model: model || "gpt-4o-mini",
      isConfigured: !!apiKey,
    }
  } catch (error) {
    console.error("Error getting ChatGPT settings:", error)
    return {
      apiKey: null,
      organizationId: null,
      model: "gpt-4o-mini",
      isConfigured: false,
    }
  }
}

export async function saveChatGPTSettings({
  apiKey,
  organizationId,
  model,
}: {
  apiKey: string
  organizationId?: string
  model?: string
}) {
  try {
    await setSystemSetting("CHATGPT_API_KEY", apiKey)

    if (organizationId) {
      await setSystemSetting("CHATGPT_ORGANIZATION_ID", organizationId)
    }

    if (model) {
      await setSystemSetting("CHATGPT_MODEL", model)
    }

    revalidatePath("/settings")

    return { success: true }
  } catch (error) {
    console.error("Failed to save ChatGPT settings:", error)
    throw new Error("Failed to save ChatGPT settings")
  }
}

export async function testChatGPTConnection() {
  try {
    const settings = await getChatGPTSettings()

    if (!settings.isConfigured) {
      throw new Error("ChatGPT API is not configured. Please set up your API key first.")
    }

    // Test the API connection with a simple request
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    }

    if (settings.organizationId) {
      headers["OpenAI-Organization"] = settings.organizationId
    }

    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to connect to OpenAI API")
    }

    const data = await response.json()
    const hasGPT4 = data.data.some((model: any) => model.id.includes("gpt-4"))

    return {
      success: true,
      modelsAvailable: data.data.length,
      hasGPT4,
    }
  } catch (error) {
    console.error("Failed to test ChatGPT connection:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to test ChatGPT connection")
  }
}

async function makeOpenAIRequest(messages: any[], maxTokens = 800) {
  const settings = await getChatGPTSettings()

  if (!settings.isConfigured) {
    throw new Error("ChatGPT API is not configured. Please set up your API key first.")
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey}`,
  }

  if (settings.organizationId) {
    headers["OpenAI-Organization"] = settings.organizationId
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to get AI response")
  }

  return response.json()
}

export async function analyzeActivity(activityData: {
  name: string
  type: string
  distance: number
  duration: number
  elevationGain: number
  averageSpeed: number
  maxSpeed: number
  startDate: string
}) {
  try {
    // Convert metrics to more readable format
    const distanceKm = (activityData.distance / 1000).toFixed(2)
    const durationMinutes = Math.round(activityData.duration / 60)
    const avgSpeedKmh = (activityData.averageSpeed * 3.6).toFixed(1)
    const maxSpeedKmh = (activityData.maxSpeed * 3.6).toFixed(1)

    const prompt = `Analyze this ${activityData.type.toLowerCase()} activity and provide insights:

Activity: ${activityData.name}
Type: ${activityData.type}
Distance: ${distanceKm} km
Duration: ${durationMinutes} minutes
Elevation Gain: ${activityData.elevationGain} meters
Average Speed: ${avgSpeedKmh} km/h
Max Speed: ${maxSpeedKmh} km/h
Date: ${new Date(activityData.startDate).toLocaleDateString()}

Please provide:
1. Performance analysis (pace, speed, effort level)
2. Training insights and recommendations
3. Comparison to typical ${activityData.type.toLowerCase()} activities
4. Areas for improvement
5. Positive highlights

Keep the analysis concise but insightful, focusing on actionable feedback for the athlete.`

    const data = await makeOpenAIRequest([
      {
        role: "system",
        content:
          "You are a professional sports coach and data analyst. Provide helpful, encouraging, and actionable insights about athletic performance based on activity data.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])

    return {
      analysis: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }
  } catch (error) {
    console.error("Failed to analyze activity:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to analyze activity")
  }
}

export async function generateDashboardInsights(data: {
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
}) {
  try {
    const { recentActivities, stats } = data

    // Calculate some basic metrics
    const totalDistanceKm = (stats.totalDistance / 1000).toFixed(0)
    const totalHours = Math.round(stats.totalDuration / 3600)
    const avgDistance =
      recentActivities.length > 0
        ? (recentActivities.reduce((sum, a) => sum + a.distance, 0) / recentActivities.length / 1000).toFixed(1)
        : "0"

    const activityTypes = [...new Set(recentActivities.map((a) => a.type))]
    const recentActivitySummary = recentActivities
      .slice(0, 5)
      .map((a) => `${a.type}: ${(a.distance / 1000).toFixed(1)}km in ${Math.round(a.elapsed_time / 60)}min`)
      .join(", ")

    const prompt = `Analyze this athlete's training data and provide personalized insights:

OVERALL STATS:
- Total Activities: ${stats.totalActivities}
- Total Distance: ${totalDistanceKm} km
- Total Training Time: ${totalHours} hours
- Total Elevation: ${stats.totalElevation} m

RECENT ACTIVITY PATTERNS:
- Activity Types: ${activityTypes.join(", ")}
- Average Distance: ${avgDistance} km
- Recent Activities: ${recentActivitySummary}

Please provide:
🎯 Training goals and recommendations
📈 Progress trends and patterns you notice
⚡ Quick tips for improvement
🏆 Achievements and positive highlights

Keep insights practical, motivating, and actionable. Focus on patterns, consistency, and areas for growth.`

    const dataResponse = await makeOpenAIRequest(
      [
        {
          role: "system",
          content:
            "You are an expert fitness coach analyzing an athlete's training data. Provide encouraging, data-driven insights that help them improve their performance and stay motivated.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      600,
    )

    return {
      insights: dataResponse.choices[0].message.content,
      tokensUsed: dataResponse.usage?.total_tokens || 0,
    }
  } catch (error) {
    console.error("Failed to generate dashboard insights:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to generate insights")
  }
}

export async function compareActivities(
  activities: Array<{
    id: number
    name: string
    type: string
    distance: number
    elapsed_time: number
    total_elevation_gain: number
    average_speed: number
    start_date: string
  }>,
) {
  try {
    const activitiesSummary = activities
      .map((a, index) => {
        const distanceKm = (a.distance / 1000).toFixed(2)
        const durationMin = Math.round(a.elapsed_time / 60)
        const speedKmh = (a.average_speed * 3.6).toFixed(1)
        const date = new Date(a.start_date).toLocaleDateString()

        return `Activity ${index + 1}: ${a.name}
- Type: ${a.type}
- Distance: ${distanceKm} km
- Duration: ${durationMin} minutes  
- Average Speed: ${speedKmh} km/h
- Elevation: ${a.total_elevation_gain} m
- Date: ${date}`
      })
      .join("\n\n")

    const prompt = `Compare these ${activities.length} activities and provide insights:

${activitiesSummary}

Please analyze:
1. **Performance Comparison**: Speed, endurance, and efficiency differences
2. **Progress Trends**: Improvements or declines over time
3. **Training Patterns**: What these activities reveal about training approach
4. **Recommendations**: Specific advice based on the comparison

Focus on actionable insights that help the athlete understand their performance patterns and areas for improvement.`

    const data = await makeOpenAIRequest(
      [
        {
          role: "system",
          content:
            "You are a sports performance analyst. Compare activities to identify trends, improvements, and provide actionable training advice.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      700,
    )

    return {
      comparison: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }
  } catch (error) {
    console.error("Failed to compare activities:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to compare activities")
  }
}
