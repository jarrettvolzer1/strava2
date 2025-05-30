import { z } from "zod"

// Input validation schemas
export const importActivitiesSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20),
})

export const stravaSettingsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  webhookVerifyToken: z.string().optional(),
  appUrl: z.string().url(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
})

// Sanitize sensitive data from logs
export function sanitizeForLogs(data: any): any {
  if (typeof data !== "object" || data === null) return data

  const sanitized = { ...data }
  const sensitiveKeys = ["password", "token", "secret", "key", "access_token", "refresh_token"]

  for (const key in sanitized) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = "***REDACTED***"
    }
  }

  return sanitized
}
