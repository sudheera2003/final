"use client"

import { useEffect, useState } from "react"
import { User, columns } from "./columns"
import { DataTable } from "./data-table"
import { Loader2 } from "lucide-react"
import { useSocket } from "@/hooks/use-socket"

export default function UsersPage() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const socket = useSocket() // <--- Initialize Socket

  // 1. Fetch Initial Data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users`)
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error("Failed to fetch users", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 2. Real-Time Updates (The Logic)
  useEffect(() => {
    if (!socket) return

    // EVENT: User Created
    socket.on("user_created", (newUser: User) => {
      console.log("New User Created:", newUser)
      // Add new user to the list
      setData((prev) => [...prev, newUser])
    })

    // EVENT: User Deleted
    socket.on("user_deleted", (data: { _id: string }) => {
      console.log("User Deleted:", data._id)
      // Remove user from the list
      setData((prev) => prev.filter((user) => user._id !== data._id))
    })

    // Cleanup listeners when page unmounts
    return () => {
      socket.off("user_created")
      socket.off("user_deleted")
    }
  }, [socket])

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  )
}