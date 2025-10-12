// features/RoomChat/hooks/SocketProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SIGNALING_URL = (process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001").replace(/\/$/, "");

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to /rooms namespace
    const socket = io(`${SIGNALING_URL}/rooms`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Optional: log room events
    socket.on("rooms", (rooms) => console.log("📡 Rooms list updated:", rooms));
    socket.on("room-created", (room) => console.log("🏠 Room created:", room));
    socket.on("room-deleted", (data) => console.log("🗑️ Room deleted:", data.roomId));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
