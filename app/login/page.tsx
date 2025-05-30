"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Get redirect URL from query params
  const redirectUrl = searchParams.get("redirect") || "/dashboard"
  const loginError = searchParams.get("error")

  useEffect(() => {
    if (loginError) {
      switch (loginError) {
        case "session_expired":
          setError("Your session has expired. Please log in again.")
          break
        case "invalid_session":
          setError("Invalid session. Please log in again.")
          break
        case "not_authenticated":
          setError("Please log in to continue.")
          break
        default:
          setError("Please log in to continue.")
      }
    }
  }, [loginError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.user.password_set === false) {
          router.push("/set-password")
        } else {
          // Redirect to the original destination or dashboard
          router.push(redirectUrl)
        }
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription className="text-blue-100">
            Enter your username and password to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 p-6">
            {loginError && (
              <Alert>
                <AlertDescription>
                  {loginError === "session_expired" &&
                    "Your session expired during Strava connection. Please log in again."}
                  {loginError === "invalid_session" && "Invalid session. Please log in again."}
                  {loginError === "not_authenticated" && "Please log in to continue."}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-blue-600">First time users can leave password blank</p>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">{error}</p>}
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
