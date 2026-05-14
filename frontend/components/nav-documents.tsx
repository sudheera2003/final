"use client"

import { useState, useEffect } from "react"
import { 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { usePathname } from "next/navigation"

// import permission hook
import { usePermissions } from "@/hooks/use-permissions"

type RoleOption = {
  value: string;
  label: string;
};

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: React.ReactNode
  }[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([])
  const [role, setRole] = useState("") 
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const pathname = usePathname()

  // initialize permission hook
  const { hasPermission } = usePermissions()

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/roles`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setAvailableRoles(data);
          if (data.length > 0) {
            setRole(data[data.length - 1].value);
          }
        }
      } catch (error) {
        console.error("Failed to fetch available roles", error);
      }
    };
    fetchRoles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ name, email, password, role }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`User "${name}" created successfully`)
        setOpen(false) 
        setName("")
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        if (availableRoles.length > 0) setRole(availableRoles[availableRoles.length - 1].value);
      } else {
        toast.error(data.error || "Failed to create user")
      }
    } catch (error) {
      toast.error("Connection error. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  // auto hide empty gruops
  if (items.length === 0 && !hasPermission("user_management")) {
    return null; 
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>User Management</SidebarGroupLabel>
      <SidebarMenu>
        
        {/* add user button */}
        {hasPermission("user_management") && (
          <SidebarMenuItem>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton tooltip="Add New User">
                  <UserPlus />
                  <span>Add New User</span>
                </SidebarMenuButton>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user and assign their access level.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateUser} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" required />
                  </div>

                  <div className="grid gap-2">
                    <Label>Account Role</Label>
                    <Select value={role} onValueChange={setRole} disabled={availableRoles.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirm" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm Password" className="pr-10" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="ml-auto mt-2">
                    <Button type="submit" disabled={loading || !role}>
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Account"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        )}
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={pathname === item.url}>
              <Link href={item.url}>
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}

      </SidebarMenu>
    </SidebarGroup>
  )
}