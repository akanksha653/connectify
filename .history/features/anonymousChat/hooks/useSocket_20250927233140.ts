import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export default function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!SOCKET_URL) {
      console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
      return;
    }

    // Create new socket connection
    const newSocket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      forceNew: true, // ensures a fresh socket instance
    });

    // Event listeners
    newSocket.on("connect", () => {
      console.log("✅ Connected to socket server:", newSocket.id);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from socket server:", reason);
    });

    newSocket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  return socket;
}
