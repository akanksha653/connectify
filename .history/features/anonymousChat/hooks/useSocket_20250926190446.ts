// features/anonymousChat/hooks/useSocket.ts
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

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
    });

    // --- CONNECTION EVENTS ---
    newSocket.on("connect", () => {
      console.log("✅ Connected to socket server:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
    });

    newSocket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    // --- 1-1 ANONYMOUS CHAT EVENTS ---
    newSocket.on("matched", (data) => {
      console.log("👤 Matched with partner:", data);
    });

    newSocket.on("partner-left", (data) => {
      console.log("❌ Partner left:", data);
    });

    newSocket.on("offer", (data) => {
      console.log("📨 Received offer:", data);
    });

    newSocket.on("answer", (data) => {
      console.log("📩 Received answer:", data);
    });

    newSocket.on("ice-candidate", (data) => {
      console.log("🧊 Received ICE candidate:", data);
    });

    newSocket.on("receive-message", (msg) => {
      console.log("💬 Received message:", msg);
    });

    newSocket.on("typing", (data) => {
      console.log("✍️ Typing indicator:", data);
    });

    // --- ROOM SYSTEM EVENTS ---
    newSocket.on("joined-room", (roomId: string) => {
      console.log("✅ Joined room:", roomId);
    });

    newSocket.on("room-message", (msg) => {
      console.log("💬 Room message:", msg);
    });

    newSocket.on("user-joined", (data) => {
      console.log("👥 User joined room:", data);
    });

    newSocket.on("user-left", (data) => {
      console.log("❌ User left room:", data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}
