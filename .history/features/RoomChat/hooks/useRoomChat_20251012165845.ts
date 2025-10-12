// features/RoomSystem/hooks/useRoomSocket.ts
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { RoomEvents } from "../utils/roomEvents";

const ROOM_SERVER_URL = process.env.NEXT_PUBLIC_ROOM_SERVER_URL || "http://localhost:3001/rooms";

export function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      const s = io(ROOM_SERVER_URL);
      socketRef.current = s;
      setSocket(s);

      s.on("connect", () => console.log("✅ Connected to room server:", s.id));
      s.on("disconnect", (reason) => console.log("❌ Disconnected from room server:", reason));
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const sendMessage = (roomId: string, message: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send-message", { roomId, message });
  };

  const joinRoom = (roomId: string, user: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit("join-room", { roomId, user });
  };

  const leaveRoom = (roomId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("leave-room", { roomId });
  };

  return {
    socket,
    sendMessage,
    joinRoom,
    leaveRoom,
  };
}
