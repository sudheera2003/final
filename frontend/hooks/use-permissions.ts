"use client"
import { useEffect, useState } from "react"

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false) // Helps prevent flickering

  useEffect(() => {
    // grab the permissions from storage when the page loads
    const storedPerms = localStorage.getItem("permissions")
    
    if (storedPerms) {
      setPermissions(JSON.parse(storedPerms))
    }
    
    setIsLoaded(true)
  }, [])

  // function that checks the user's "Key Ring"
  const hasPermission = (targetPermission: string) => {
    return permissions.includes(targetPermission)
  }

  return { hasPermission, isLoaded }
}