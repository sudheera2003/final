"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Power } from "lucide-react"

export function SiteHeader() {
  const pathname = usePathname()

  // route names
  const getPageTitle = (path: string) => {
    if (path === "/") return "Dashboard"
    if (path === "/users") return "User Management"
    if (path === "/roles") return "Permission Management"
    if (path === "/sales") return "Sales Overview"
    if (path === "/inventory") return "Inventory Management"
    if (path === "/products") return "Product Catalog"
    
    // fallback: capitalize the first letter of the path segment (e.g. /inventory -> Inventory)
    const segment = path.split("/")[1]
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "Resto App"
  }

  const title = getPageTitle(pathname)

  return (
    <header className="rounded-t-xl sticky top-0 z-50 bg-background flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-8"
        />
        
        {/* dynamic title */}
        <h1 className="text-base font-medium">
          {title}
        </h1>
        
        <div className="ml-auto mt-1">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}