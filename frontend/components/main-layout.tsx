"use client"

import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import NextTopLoader from "nextjs-toploader"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null) // null = "checking"

  useEffect(() => {
    const token = localStorage.getItem("token")
    const authenticated = !!token
    
    setIsLoggedIn(authenticated)

    // Redirect to login if not authenticated and not already on the login page
    if (!authenticated && pathname !== "/login") {
      router.push("/login")
    }
  }, [pathname, router])

  // 1. WHILE CHECKING: Show a blank screen or a spinner to prevent content flash
  if (isLoggedIn === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isLoginPage = pathname === "/login"

  // 2. GUEST VIEW: If on login page or redirecting
  if (isLoginPage || !isLoggedIn) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background">
        {children}
      </main>
    )
  }

  // 3. AUTHENTICATED VIEW: Full Dashboard
  return (
    <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" collapsible="icon" />
          <SidebarInset>
            <NextTopLoader />
            <SiteHeader />
            {children}
          </SidebarInset>
        </SidebarProvider>
  )
}