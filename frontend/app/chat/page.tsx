"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Bot, User, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  updated_at: string;
};

export default function ChatbotPage() {
  // --- STATE ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isLoadingHistory]);

  // --- 1. LOAD SIDEBAR SESSIONS ---
  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/sessions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to load sessions", error);
    }
  };

  // --- 2. LOAD SPECIFIC CHAT HISTORY ---
  const loadChatHistory = async (sessionId: string) => {
    setIsLoadingHistory(true);
    setCurrentSessionId(sessionId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/history/${sessionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const pastMessages = await res.json();
        if (pastMessages && pastMessages.length > 0) {
          const formattedHistory = pastMessages.map((msg: any) => ({
            role: msg.sender === "user" ? "user" : "assistant", 
            content: msg.text
          }));
          setMessages(formattedHistory);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      toast.error("Failed to load chat history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Initial Load: Fetch sidebar
  useEffect(() => {
    fetchSessions().then(() => setIsLoadingHistory(false));
    // Start with a blank default screen
    handleNewChat();
  }, []);

  // --- 3. CREATE NEW CHAT ---
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([{
      role: "assistant",
      content: "Hello! I am **RestoAI**, your Lady Hill Hotel management assistant. I'm connected directly to your live inventory and sales data. How can I help you today?",
    }]);
  };

  // --- 4. DELETE CHAT ---
  const handleDeleteChat = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking the row behind the button
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/${sessionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success("Chat deleted");
        fetchSessions(); // Refresh sidebar
        if (currentSessionId === sessionId) {
          handleNewChat(); // If they deleted the active chat, clear the screen
        }
      }
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  // --- 5. SEND MESSAGE ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput(""); 
    
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Send the current session ID (if null, backend will create a new one)
        body: JSON.stringify({ message: userMsg, session_id: currentSessionId }), 
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        
        // If this was a new chat, the backend just created an ID. Save it!
        if (!currentSessionId && data.session_id) {
          setCurrentSessionId(data.session_id);
          fetchSessions(); // Refresh the sidebar so the new chat appears
        }
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
    <div className="flex w-full h-[calc(100vh-80px)] bg-background overflow-hidden">
      
      {/* ─── SIDEBAR (GEMINI STYLE) ─── */}
      <div className="w-64 border-r bg-muted/10 hidden md:flex flex-col shrink-0">
        <div className="p-4">
          <Button 
            onClick={handleNewChat} 
            className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0" 
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 px-2 pb-4">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 mt-4">Recent Conversations</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => loadChatHistory(session.id)}
                className={`group flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id 
                    ? "bg-muted font-medium text-foreground" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{session.title}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteChat(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2 italic">No recent chats.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── MAIN CHAT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <div className="border-b bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-semibold leading-none mb-1 text-(--primary)">RestoAI Assistant</h1>
            <p className="text-xs text-muted-foreground">Live Context-Aware Management AI</p>
          </div>
        </div>

        {/* CHAT MESSAGES */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-muted/5">
          <div className="max-w-4xl mx-auto space-y-6 pb-4">
            
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading conversation...</p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    </div>

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
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT AREA */}
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
                disabled={isLoading || isLoadingHistory}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || isLoadingHistory || !input.trim()}
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
    </div>
  );
}