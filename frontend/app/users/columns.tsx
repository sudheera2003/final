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

export type User = {
  _id: string
  name: string
  email: string
  role: string
}

export const columns: ColumnDef<User>[] = [
  // --- ID COLUMN ---
//   {
//     accessorKey: "_id",
//     header: "ID",
//     cell: ({ row }) => <div className="w-[80px] truncate">{row.getValue("_id")}</div>,
//     enableSorting: false,
//     enableHiding: true,
//   },

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
        return (
             <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                role === 'admin' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {role}
              </span>
        )
    }
  },

  // --- ACTIONS COLUMN (Fixed Delete Logic) ---
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
 
      const handleDelete = async () => {
        // 1. Get the token FRESH right when you click delete
        const token = localStorage.getItem("token")

        if (!token) {
            toast.error("You are not logged in!")
            return
        }

        try {
            const res = await fetch(`http://127.0.0.1:5000/api/users/${user._id}`, {
                method: "DELETE",
                headers: { 
                    "Content-Type": "application/json", // Good practice
                    "Authorization": `Bearer ${token}`  // <--- CRITICAL LINE
                }
            })
            
            const data = await res.json()

            if (res.ok) {
                toast.success("User deleted successfully")
                // Note: The WebSocket will handle the page refresh automatically!
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
            <DropdownMenuSeparator />
            <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600 cursor-pointer"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]