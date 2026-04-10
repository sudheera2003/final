"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Command } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          
          {/* Logo Header */}
          <div className="flex items-center justify-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Command className="size-4" />
            </div>
            RestoAI System
          </div>

          {/* Login Card */}
          <Card className="overflow-hidden w-100">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleLogin} className="flex flex-col gap-6">
                
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground text-sm mt-1">
                    Login to your RestoAI account
                  </p>
                </div>
                
                <div className="grid gap-6">
                  {/* Email Field */}
                  <div className="grid gap-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@ladyhill.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Password Field */}
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <label htmlFor="password" className="text-sm font-medium leading-none">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="pr-10"
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}