// features/anonymousChat/hooks/useSocket.ts
import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export interface RoomPayload {
  roomId: string;
  name?: string;
  topic?: string;
  description?: string;
  password?: string;
}

export default function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!SOCKET_URL) {
      console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      forceNew: true,
    });

    newSocket.on("connect", () => {
      console.log("✅ Connected to socket server:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
    });

    newSocket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ---------- 🔗 ROOM HELPERS ----------
  const createRoom = useCallback(
    (data: Omit<RoomPayload, "roomId">, cb?: (res: any) => void) => {
      socket?.emit("room:create", data, cb);
    },
    [socket]
  );

  const joinRoom = useCallback(
    (payload: { roomId: string; password?: string }, cb?: (res: any) => void) => {
      socket?.emit("room:join", payload, cb);
    },
    [socket]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      socket?.emit("room:leave", { roomId });
    },
    [socket]
  );

  const sendRoomMessage = useCallback(
    (roomId: string, message: string) => {
      socket?.emit("room:message", { roomId, message });
    },
    [socket]
  );

  const listRooms = useCallback(
    (cb: (rooms: any[]) => void) => {
      socket?.emit("room:list", null, cb);
    },
    [socket]
  );

  return {
    socket,          // ✅ still accessible for anonymous chat
    createRoom,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    listRooms,
  };
}
