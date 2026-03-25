"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Trash2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useState, useEffect } from "react" // <--- Import React hooks!

export type User = {
  _id: string
  name: string
  email: string
  role: string
}

export const columns: ColumnDef<User>[] = [
  // --- NAME COLUMN ---
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },

  // --- EMAIL COLUMN ---
  {
    accessorKey: "email",
    header: "Email",
  },

  // --- ROLE COLUMN ---
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
        const role = row.getValue("role") as string
        
        // Define badge colors based on the role
        let badgeColor = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        if (role === 'admin') badgeColor = "bg-red-500/10 text-red-600 dark:text-red-400"
        if (role === 'super_admin') badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
        if (role === 'user') badgeColor = "bg-green-500/10 text-green-600 dark:text-green-400"

        return (
             <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${badgeColor}`}>
                {role.replace('_', ' ')}
              </span>
        )
    }
  },

  // --- ACTIONS COLUMN ---
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      
      // --- THE FIX: Use React state to grab the role safely on the client side ---
      const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

      useEffect(() => {
        setCurrentUserRole(localStorage.getItem("role"))
      }, [])
      // -------------------------------------------------------------------------

      const handleDelete = async () => {
        const token = localStorage.getItem("token")

        if (!token) {
            toast.error("You are not logged in")
            return
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user._id}`, {
                method: "DELETE",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                }
            })
            
            const data = await res.json()

            if (res.ok) {
                toast.success("User deleted successfully")
            } else {
                toast.error(data.error || "Failed to delete user")
            }
        } catch (e) {
            toast.error("Connection error")
            console.error(e)
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Email
            </DropdownMenuItem>
          
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                </DropdownMenuItem>
              </>
            
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]