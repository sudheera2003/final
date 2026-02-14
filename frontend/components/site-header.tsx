"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

export function SiteHeader() {
  const pathname = usePathname()

  // Define your route names here
  const getPageTitle = (path: string) => {
    // Normalizing the path to handle trailing slashes or sub-routes if needed
    if (path === "/") return "Dashboard"
    if (path === "/users") return "User Management"
    
    // Fallback: Capitalize the first letter of the path segment (e.g. /inventory -> Inventory)
    const segment = path.split("/")[1]
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "Resto App"
  }

  const title = getPageTitle(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-8"
        />
        
        {/* Dynamic Title */}
        <h1 className="text-base font-medium">
          {title}
        </h1>
        
        <div className="ml-auto mt-1">
          <AnimatedThemeToggler />
        </div>
      </div>
    </header>
  )
}