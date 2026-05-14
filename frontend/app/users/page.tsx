"use client"

import { useEffect, useState } from "react"
import { User, columns } from "./columns"
import { DataTable } from "./data-table"
import { Loader2 } from "lucide-react"
import { useSocket } from "@/hooks/use-socket"
import { toast } from "sonner"

export default function UsersPage() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const socket = useSocket() 

  // fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("token")
        
        if (!token) {
          window.location.href = "/login"
          return
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        })
        
        if (res.status === 401) {
          toast.error("Session expired. Please log in again.")
          window.location.href = "/login"
          return
        }

        const result = await res.json()
        
        if (res.ok) {
          setData(result)
        } else {
          toast.error(result.error || "Failed to fetch users")
        }
      } catch (error) {
        console.error("Failed to fetch users", error)
        toast.error("Network error while loading users")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // real time updates
  useEffect(() => {
    if (!socket) return

    // user create
    socket.on("user_created", (newUser: User) => {
      console.log("New User Created:", newUser)
      setData((prev) => [...prev, newUser])
    })

    // user delete
    socket.on("user_deleted", (data: { _id: string }) => {
      console.log("User Deleted:", data._id)
      setData((prev) => prev.filter((user) => user._id !== data._id))
    })

    // cleanup listeners when page unmounts
    return () => {
      socket.off("user_created")
      socket.off("user_deleted")
    }
  }, [socket])

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-3 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Users</h1>
          <p className="text-muted-foreground mt-1">View and manage all users in the system.</p>
        </div>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  )
}