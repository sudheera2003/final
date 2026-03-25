"use client";

import * as React from "react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  ChartArea,
  Box,
  Package2,
  BotMessageSquare,
  CircleHelpIcon,
  UserRoundSearchIcon,
  ShieldUserIcon,
  CommandIcon,
  Ticket,
} from "lucide-react";
import Link from "next/link";

// --- 1. IMPORT YOUR SECURITY HOOK ---
import { usePermissions } from "@/hooks/use-permissions";

// --- 2. ADD PERMISSION REQUIREMENTS TO EACH ROUTE ---
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: <LayoutDashboardIcon />,
      permission: "view_dashboard", // <--- Required Key
    },
    {
      title: "Sales",
      url: "/sales",
      icon: <ChartArea />,
      permission: "view_sales",
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: <Box />,
      permission: "view_inventory",
    },
    {
      title: "Products",
      url: "/products",
      icon: <Package2 />,
      permission: "view_products",
    },
    {
      title: "Chat-Bot",
      url: "/chat",
      icon: <BotMessageSquare />,
      permission: "use_ai_chat",
    },
    {
      title: "Tickets",
      url: "/tickets",
      icon: <Ticket />,
      permission: "manage_tickets",
    },
  ],
  navSecondary: [
    {
      title: "Get Help",
      url: "/help",
      icon: <CircleHelpIcon />,
      // No permission required, visible to everyone
    },
  ],
  documents: [
    {
      name: "All Users",
      url: "/users",
      icon: <UserRoundSearchIcon />,
      permission: "user_management",
    },
    {
      name: "Manage Permissions",
      url: "/roles",
      icon: <ShieldUserIcon />,
      permission: "manage_roles",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // --- 3. INITIALIZE HOOK ---
  const { hasPermission, isLoaded } = usePermissions();

  // --- 4. FILTER THE ARRAYS BEFORE RENDERING ---
  // If an item has a permission, check if the user has it. If no permission is set, always show it.
  const filteredNavMain = data.navMain.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  const filteredDocuments = data.documents.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <CommandIcon className="size-5! text-(--primary)" />
                <span className="text-base font-semibold text-(--primary)">
                  RestoAI
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Pass the FILTERED arrays down to the components */}
        <NavMain items={filteredNavMain} />
        <NavDocuments items={filteredDocuments} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
