"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ChefHat, Sparkles, Command } from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Highlighter } from "@/components/ui/highlighter";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", data.email);
        localStorage.setItem("name", data.name);
        localStorage.setItem("role", data.role);
        localStorage.setItem("permissions", JSON.stringify(data.permissions));

        toast.success("Login Success");

        // --- SMART ROUTING ---
        const perms = data.permissions || [];
        let targetUrl = "/"; // Default assumption

        // If they CANNOT see the dashboard, find the first page they CAN see
        if (!perms.includes("view_dashboard")) {
          if (perms.includes("view_sales")) {
            targetUrl = "/sales";
          } else if (perms.includes("view_inventory")) {
            targetUrl = "/inventory";
          } else if (perms.includes("view_products")) {
            targetUrl = "/products";
          } else if (perms.includes("use_ai_chat")) {
            targetUrl = "/chat";
          } else {
            targetUrl = "/help"; // fallback if user have almost no permissions
          }
        }

        window.location.href = targetUrl;
      } else {
        toast.error(data.error || "Invalid Credentials");
      }
    } catch (error) {
      toast.error("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex bg-background">
      
      {/* ── LEFT SIDE: Brand & Hero (Hidden on Mobile) ── */}
      <div className="relative hidden w-1/2 flex-col bg-muted/30 p-10 text-foreground dark:bg-zinc-950 dark:text-white lg:flex justify-between overflow-hidden border-r">
        
        {/* Abstract Background Gradients */}
        <div className="absolute inset-0 bg-muted/30 dark:bg-zinc-950" />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent dark:from-emerald-900/40 dark:via-zinc-950 dark:to-zinc-950" />
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[100px] dark:bg-emerald-500/10" />
        
        {/* Logo Section */}
        <div className="relative z-20 flex items-center text-xl font-bold gap-2 tracking-tight">
          <div className="p-2 rounded-xl text-primary-foreground">
            <Command className="h-6 w-6 text-primary" />
          </div>
          <TypingAnimation>RestoAI System</TypingAnimation>
        </div>

        <div className="relative z-20 mt-auto pb-12 space-y-4">
          <p className="text-lg leading-relaxed max-w-md text-muted-foreground dark:text-zinc-300">
            System Administration
          </p>
        </div>
      </div>

      {/* ── RIGHT SIDE: Login Form ── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px]">
          
          {/* Header */}
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-semibold tracking-tight">
              <Highlighter action="underline" color="#0791B2">Welcome to RestoAI.</Highlighter>
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the management dashboard.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@ladyhill.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                  Password
                </label>
                {/* Visual Dummy Link for realism */}
                <span className="text-xs font-medium text-primary hover:underline cursor-pointer transition-all">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 h-11"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full h-11 font-medium text-md mt-2 cursor-pointer" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            
          </form>

        </div>
      </div>

    </div>
  );
}