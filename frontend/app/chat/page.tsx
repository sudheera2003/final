"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am **RestoAI**, your Lady Hill Hotel management assistant. I'm connected directly to your live inventory and sales data. How can I help you today?",
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput(""); // Clear input box immediately
    
    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      // Call our new context-injected Python backend route
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMsg }),
      });

      if (res.status === 401) {
        toast.error("Session expired. Please log in again");
        window.location.href = "/login";
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        toast.error(data.error || "Failed to get AI response");
      }
    } catch (error) {
      toast.error("Network error communicating with AI");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* 1. Removed p-6, max-w-5xl, and mx-auto to allow full width.
      2. Calculated height dynamically to prevent full-page scrolling.
    */
    <div className="flex flex-col w-full h-[calc(100vh-80px)] bg-background">
      
      {/* HEADER: Full width, subtle bottom border */}
      <div className="border-b bg-background/95 backdrop-blur px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-semibold leading-none mb-1 text-(--primary)">RestoAI Assistant</h1>
          <p className="text-xs text-muted-foreground">Live Context-Aware Management AI</p>
        </div>
      </div>

      {/* CHAT MESSAGES AREA: Takes up remaining space, scrolls internally */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-muted/5">
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-4 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* AVATAR */}
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>

              {/* MESSAGE BUBBLE */}
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-background border border-border rounded-tl-sm text-foreground"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* LOADING INDICATOR */}
          {isLoading && (
            <div className="flex items-start gap-4 flex-row">
              <div className="flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Bot className="h-5 w-5" />
              </div>
              <div className="max-w-[80%] rounded-2xl p-4 rounded-tl-sm bg-background border border-border flex items-center gap-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">RestoAI is analyzing database...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA: Fixed at the bottom */}
      <div className="p-4 bg-background border-t shrink-0">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-3 bg-muted/30 p-2 rounded-[24px] border focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-sm"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, today's sales, or what to prep for tomorrow..."
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="rounded-full h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-3">
            <span className="text-[10px] text-muted-foreground">
              RestoAI can make mistakes. Verify critical stock decisions on the dashboard.
            </span>
          </div>
        </div>
      </div>
      
    </div>
  );
}