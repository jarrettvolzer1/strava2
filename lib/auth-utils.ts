"use server"

import { cookies } from "next/headers"
import { verifySession } from "./simple-auth"

export interface User {
  id: string
  username: string
  email: string
  role: string
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session-token")?.value

    if (!sessionToken) {
      return null
    }

    const user = await verifySession(sessionToken)
    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export async function requireRole(requiredRole: string): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  if (user.role !== requiredRole && user.role !== "admin") {
    throw new Error("Insufficient permissions")
  }

  return user
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  return user
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "admin" || false
}
