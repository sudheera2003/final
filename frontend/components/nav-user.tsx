"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EllipsisVerticalIcon,
  CircleUserRoundIcon,
  LogOutIcon,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const socket = useSocket();

  const [userData, setUserData] = useState(user);
  
  // State to control the visibility of the logout confirmation dialog
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  // 1. Load Initial User Data from LocalStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    const storedName = localStorage.getItem("name");

    if (storedEmail) {
      setUserData({
        ...user,
        name: storedName || "User",
        email: storedEmail,
      });
    }
  }, [user]);

  // 2. Listen for Real-Time Updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on("profile_updated", (data: any) => {
      // Get the currently logged-in email
      const currentEmail = localStorage.getItem("email");

      // Check if the update is meant for THIS user
      if (data.email === currentEmail) {
        console.log("Real-time profile update received:", data);

        // Update State instantly
        setUserData((prev) => ({
          ...prev,
          name: data.name,
        }));

        // Persist to LocalStorage so it stays after refresh
        localStorage.setItem("name", data.name);
      }
    });

    return () => {
      socket.off("profile_updated");
    };
  }, [socket]);

  // 3. Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email"); 
    localStorage.removeItem("name");
    router.push("/login");
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : "CN";
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={userData.avatar} alt={userData.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(userData.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userData.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {userData.email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userData.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {userData.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/profile">
                <DropdownMenuItem>
                  <CircleUserRoundIcon />
                  Account
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault(); // Prevents the dropdown from ignoring the alert opening
                setShowLogoutAlert(true);
              }}
              className="cursor-pointer text-red-500 focus:text-red-500"
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* LOGOUT CONFIRMATION DIALOG */}
        <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will need to re-enter your credentials to access the RestoAI dashboard again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogout} 
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarMenuItem>
    </SidebarMenu>
  );
}