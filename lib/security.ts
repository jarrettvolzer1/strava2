import crypto from "crypto"

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken))
}

// Data encryption for sensitive fields
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32)
const ALGORITHM = "aes-256-gcm"

export function encryptSensitiveData(text: string): string {
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)

    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")

    const authTag = cipher.getAuthTag()

    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted
  } catch (error) {
    console.error("Encryption error:", error)
    return text // Fallback to unencrypted in case of error
  }
}

export function decryptSensitiveData(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":")
    if (parts.length !== 3) return encryptedText // Not encrypted

    const iv = Buffer.from(parts[0], "hex")
    const authTag = Buffer.from(parts[1], "hex")
    const encrypted = parts[2]

    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (error) {
    console.error("Decryption error:", error)
    return encryptedText // Return as-is if decryption fails
  }
}

// Security headers
export function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy":
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.strava.com https://www.googleapis.com; " +
      "frame-ancestors 'none';",
  }
}
