import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// ✅ Ensure you have this in your .env.local
// NEXT_PUBLIC_SOCKET_URL=https://your-signaling-server.onrender.com

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    console.log("🧩 Connecting to socket:", SOCKET_URL);

    const newSocket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: true,
      autoConnect: true,
    });

    // ✅ Log connection status
    newSocket.on("connect", () => {
      console.log("✅ Connected to socket server:", newSocket.id);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("⚠️ Disconnected from socket server:", reason);
    });

    newSocket.on("connect_error", (err) => {
      console.error("🚫 Socket connection error:", err.message);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up socket connection");
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  return socket;
}
