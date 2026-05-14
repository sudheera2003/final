"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Package,
  Bot,
  Users,
  HelpCircle,
  Package2,
  ChartArea,
  Box,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// permissions hook
import { usePermissions } from "@/hooks/use-permissions";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const router = useRouter();
  
  // initialize hook
  const { hasPermission } = usePermissions();

  // listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // fetch live inventory when the modal opens
  useEffect(() => {
    // only ping the DB if they have inventory access
    if (open && inventory.length === 0 && hasPermission("view_inventory")) {
      const fetchInventory = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.ok) {
            const data = await res.json();
            setInventory(data);
          }
        } catch (error) {
          console.error("Failed to fetch inventory for search");
        }
      };
      fetchInventory();
    }
  }, [open, inventory.length, hasPermission]);

  // helper to close modal and navigate
  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      {/* sidebar button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50 w-full text-left outline-none"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm font-medium">Search</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">Ctrl +</span>K
        </kbd>
      </button>

      {/* popup modal */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search a directory or inventory..." />
          <CommandList className="custom-scrollbar">
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Quick Navigation">
              {/* conditionally render each item */}
              {hasPermission("view_dashboard") && (
                <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </CommandItem>
              )}
              
              {hasPermission("view_sales") && (
                <CommandItem onSelect={() => runCommand(() => router.push("/sales"))}>
                  <ChartArea className="mr-2 h-4 w-4" />
                  <span>Sales</span>
                </CommandItem>
              )}
              
              {hasPermission("view_inventory") && (
                <CommandItem onSelect={() => runCommand(() => router.push("/inventory"))}>
                  <Box className="mr-2 h-4 w-4" />
                  <span>Inventory</span>
                </CommandItem>
              )}
              
              {hasPermission("view_products") && (
                <CommandItem onSelect={() => runCommand(() => router.push("/products"))}>
                  <Package2 className="mr-2 h-4 w-4" />
                  <span>Products</span>
                </CommandItem>
              )}
            
              <CommandItem onSelect={() => runCommand(() => router.push("/chat"))}>
                <Bot className="mr-2 h-4 w-4 text-primary" />
                <span className="text-primary font-medium">RestoAI Chat-Bot</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="System & Help">
              <CommandItem onSelect={() => runCommand(() => router.push("/help"))}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Get Help / Documentation</span>
              </CommandItem>
              
              {hasPermission("user_management") && (
                <CommandItem onSelect={() => runCommand(() => router.push("/users"))}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Manage Users</span>
                </CommandItem>
              )}
            </CommandGroup>

            {hasPermission("view_inventory") && inventory.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Live Inventory Database">
                  {inventory.map((item) => (
                    <CommandItem
                      key={item._id}
                      onSelect={() => runCommand(() => router.push("/inventory"))}
                    >
                      <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{item.name}</span>
                      <span
                        className={`ml-auto text-xs font-medium ${item.stock <= (item.low_stock_threshold || 10) ? "text-red-500" : "text-muted-foreground"}`}
                      >
                        {item.stock} {item.unit} left
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}