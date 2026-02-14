"use client"

import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Connect to your Flask Backend
    const socketInstance = io("http://127.0.0.1:5000")

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