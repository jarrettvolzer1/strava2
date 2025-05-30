"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, Loader2, Bot, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  tokensUsed?: number
  cost?: number
  model?: string
}

interface ActivityChatbotProps {
  className?: string
}

export function ActivityChatbot({ className }: ActivityChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your AI training assistant. Ask me anything about your activities, performance, or training patterns. For example:\n\n• How did I perform this week?\n• What's my average running pace?\n• Show me my longest activities\n• How can I improve my cycling?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const [sessionStats, setSessionStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    messageCount: 0,
  })

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        tokensUsed: data.tokensUsed,
        cost: Number.parseFloat(data.cost),
        model: data.model,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update session stats
      setSessionStats((prev) => ({
        totalTokens: prev.totalTokens + (data.tokensUsed || 0),
        totalCost: prev.totalCost + (Number.parseFloat(data.cost) || 0),
        messageCount: prev.messageCount + 1,
      }))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response from AI assistant",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessage = (content: string) => {
    const lines = content.split("\n")
    return lines.map((line, index) => {
      if (line.startsWith("•") || line.startsWith("-")) {
        return (
          <li key={index} className="ml-4">
            {line.substring(1).trim()}
          </li>
        )
      }
      if (line.trim() === "") {
        return <br key={index} />
      }
      return (
        <p key={index} className="mb-2 last:mb-0">
          {line}
        </p>
      )
    })
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            AI Training Assistant
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
          <div className="text-xs font-normal text-muted-foreground">
            Session: {sessionStats.totalTokens.toLocaleString()} tokens • ${sessionStats.totalCost.toFixed(4)}
          </div>
        </CardTitle>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="space-y-4">
          <ScrollArea className="h-80 w-full pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3 text-sm", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2",
                      message.role === "user" ? "bg-blue-500 text-white ml-auto" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <div className="prose prose-sm max-w-none">
                      {message.role === "assistant" ? (
                        <div className="space-y-1">{formatMessage(message.content)}</div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-xs mt-1 opacity-70 flex items-center justify-between",
                        message.role === "user" ? "text-blue-100" : "text-muted-foreground",
                      )}
                    >
                      <span>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {message.role === "assistant" && message.tokensUsed && (
                        <span className="flex items-center gap-1">
                          <span>{message.tokensUsed} tokens</span>
                          <span>•</span>
                          <span className="text-green-600">${message.cost?.toFixed(4)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 text-sm justify-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing your activities...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your activities..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="text-xs text-muted-foreground">
            <p>💡 Try asking: "How did I perform this week?" or "What's my fastest 5K time?"</p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
