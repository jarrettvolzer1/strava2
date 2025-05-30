import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ActivityNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold mb-4">Activity Not Found</h1>
      <p className="text-muted-foreground mb-6">The activity you're looking for doesn't exist or has been deleted.</p>
      <Button asChild>
        <Link href="/activities">Back to Activities</Link>
      </Button>
    </div>
  )
}
