import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)

export interface User {
  id: string
  username: string
  email: string
  role: string
  created_at: Date
  password_set?: boolean
  failed_login_attempts?: number
  locked_until?: Date | null
}

// Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export async function createUser(username: string, email: string, password: string | null = null) {
  const userId = crypto.randomUUID()
  let hashedPassword = null
  const passwordSet = !!password

  if (password) {
    hashedPassword = await bcrypt.hash(password, 12) // Increased salt rounds
  }

  await sql`
    INSERT INTO simple_users (id, username, email, password_hash, password_set, role, created_at, failed_login_attempts, locked_until)
    VALUES (${userId}, ${username}, ${email}, ${hashedPassword}, ${passwordSet}, 'user', NOW(), 0, NULL)
  `

  return userId
}

export async function verifyUser(username: string, password: string): Promise<User | null> {
  try {
    // Get user from database
    const users = await sql`
      SELECT id, username, email, password_hash, password_set, role, created_at, failed_login_attempts, locked_until
      FROM simple_users 
      WHERE username = ${username} OR email = ${username}
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0]

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error("Account is temporarily locked due to too many failed login attempts")
    }

    // SECURITY FIX: Remove passwordless login for existing users
    // Only allow passwordless login for brand new accounts that have never had a password
    if (!user.password_set && user.failed_login_attempts > 0) {
      return null // Require password after first failed attempt
    }

    // If password is not set and this is truly first login, require password setup
    if (!user.password_set) {
      // Still allow first-time login but mark that an attempt was made
      await sql`
        UPDATE simple_users 
        SET failed_login_attempts = failed_login_attempts + 1 
        WHERE id = ${user.id}
      `

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        password_set: false,
      }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1
      let lockedUntil = null

      if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_DURATION)
      }

      await sql`
        UPDATE simple_users 
        SET failed_login_attempts = ${newFailedAttempts}, locked_until = ${lockedUntil}
        WHERE id = ${user.id}
      `

      if (lockedUntil) {
        throw new Error("Account locked due to too many failed login attempts")
      }

      return null
    }

    // Reset failed login attempts on successful login
    await sql`
      UPDATE simple_users 
      SET failed_login_attempts = 0, locked_until = NULL 
      WHERE id = ${user.id}
    `

    // Return user data
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      password_set: true,
    }
  } catch (error) {
    console.error("Error verifying user:", error)
    throw error
  }
}

export async function setPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long")
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      throw new Error("Password must contain at least one uppercase letter, one lowercase letter, and one number")
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await sql`
      UPDATE simple_users 
      SET password_hash = ${hashedPassword}, password_set = true, failed_login_attempts = 0, locked_until = NULL
      WHERE id = ${userId}
    `

    return true
  } catch (error) {
    console.error("Error setting password:", error)
    throw error
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    // Get current password hash
    const users = await sql`
      SELECT password_hash FROM simple_users WHERE id = ${userId}
    `

    if (users.length === 0) {
      return false
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, users[0].password_hash)
    if (!isValid) {
      return false
    }

    // Set new password with validation
    await setPassword(userId, newPassword)
    return true
  } catch (error) {
    console.error("Error changing password:", error)
    return false
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await sql`
    SELECT id, username, email, role, created_at, password_set
    FROM simple_users 
    WHERE id = ${id}
  `

  return users.length > 0 ? users[0] : null
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await sql`
    INSERT INTO simple_sessions (token, user_id, expires_at, created_at)
    VALUES (${sessionToken}, ${userId}, ${expiresAt}, NOW())
  `

  return sessionToken
}

export async function getSessionUser(token: string): Promise<User | null> {
  const sessions = await sql`
    SELECT s.user_id, u.username, u.email, u.role, u.created_at, u.password_set
    FROM simple_sessions s
    JOIN simple_users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `

  return sessions.length > 0
    ? {
        id: sessions[0].user_id,
        username: sessions[0].username,
        email: sessions[0].email,
        role: sessions[0].role,
        created_at: sessions[0].created_at,
        password_set: sessions[0].password_set,
      }
    : null
}

export async function deleteSession(token: string) {
  await sql`DELETE FROM simple_sessions WHERE token = ${token}`
}

export async function verifySession(token: string): Promise<User | null> {
  if (!token) return null
  return getSessionUser(token)
}
