import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function HomePage() {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get("session")?.value

  if (sessionToken) {
    // User is logged in, redirect to dashboard
    redirect("/dashboard")
  }

  // User is not logged in, show login page
  redirect("/login")
}
