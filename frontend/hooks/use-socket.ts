"use client"

import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // connect to Flask Backend
    const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL as string)

    socketInstance.on("connect", () => {
      console.log("Connected to WebSocket server")
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server")
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return socket
}