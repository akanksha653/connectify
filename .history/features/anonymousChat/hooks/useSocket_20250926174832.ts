import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

// Extend the Socket type to include our helpers
type RoomSocket = Socket & {
  createRoom?: (data: any, cb?: (res: any) => void) => void;
  joinRoom?: (payload: any, cb?: (res: any) => void) => void;
  leaveRoom?: (roomId: string) => void;
  sendRoomMessage?: (roomId: string, message: string) => void;
  listRooms?: (cb: (rooms: any[]) => void) => void;
};

export default function useSocket(): RoomSocket | null {
  const [socket, setSocket] = useState<RoomSocket | null>(null);

  useEffect(() => {
    if (!SOCKET_URL) {
      console.error("❌ NEXT_PUBLIC_SOCKET_URL is not defined");
      return;
    }

    const newSocket: RoomSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      forceNew: true,
    }) as RoomSocket;

    // -------- Room helpers (added directly on socket) --------
    newSocket.createRoom = (data, cb) =>
      newSocket.emit("room:create", data, cb);

    newSocket.joinRoom = (payload, cb) =>
      newSocket.emit("room:join", payload, cb);

    newSocket.leaveRoom = (roomId) =>
      newSocket.emit("room:leave", { roomId });

    newSocket.sendRoomMessage = (roomId, message) =>
      newSocket.emit("room:message", { roomId, message });

    newSocket.listRooms = (cb) =>
      newSocket.emit("room:list", null, cb);

    // -------- Logs --------
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

  return socket;
}
