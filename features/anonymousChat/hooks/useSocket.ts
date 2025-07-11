// features/anonymousChat/hooks/useSocket.ts

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to socket server:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}
