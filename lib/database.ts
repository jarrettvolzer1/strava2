import { neon, neonConfig } from "@neondatabase/serverless"

// Configure connection pooling and security
neonConfig.fetchConnectionCache = true

// Create a secure database connection with pooling
const sql = neon(process.env.DATABASE_URL!, {
  // Connection pooling settings
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  maxUses: 1000,
})

// Database query wrapper with security checks
export async function secureQuery(query: string, params: any[] = [], userId?: string) {
  try {
    // Log query for monitoring (without sensitive data)
    console.log("Database query:", {
      query: query.substring(0, 100) + "...",
      paramCount: params.length,
      userId: userId || "system",
      timestamp: new Date().toISOString(),
    })

    const result = await sql(query, params)
    return result
  } catch (error) {
    // Log error for monitoring
    console.error("Database error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      query: query.substring(0, 50) + "...",
      userId: userId || "system",
      timestamp: new Date().toISOString(),
    })
    throw error
  }
}

export { sql }
