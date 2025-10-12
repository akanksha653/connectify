// features/RoomChat/services/roomSocketService.ts
import { io, Socket } from "socket.io-client";
import type { Room, Participant } from "../utils/roomTypes";

let socket: Socket | null = null;
const NAMESPACE = "/rooms";

export function connectRoomSocket(onRoomsUpdated?: (rooms: Room[]) => void): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "https://connectify-hub.onrender.com"; // Use your production URL
    socket = io(`${url}${NAMESPACE}`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => console.log("✅ Room socket connected:", socket?.id));
    socket.on("disconnect", (reason) => console.log("❌ Room socket disconnected:", socket?.id, reason));

    socket.on("rooms", (rooms: Room[]) => {
      console.log("📡 Rooms list updated:", rooms);
      onRoomsUpdated?.(rooms);
    });

    socket.on("room-created", (room: Room) => console.log("🆕 Room created:", room));
    socket.on("room-deleted", ({ roomId }: { roomId: string }) => console.log("🗑️ Room deleted:", roomId));
  }

  return socket;
}

export function disconnectRoomSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function createRoom(payload: { name: string; topic: string; description?: string }) {
  if (!socket || !socket.connected) return console.warn("⚠️ Socket not connected, cannot create room");
  socket.emit("create-room", payload);
}

export function joinRoom(roomId: string, userInfo: Participant["userInfo"]) {
  if (!socket || !socket.connected) return console.warn("⚠️ Socket not connected, cannot join room");
  socket.emit("join-room", { roomId, user: { socketId: socket.id, userInfo } });
}

export function leaveRoom(roomId: string) {
  if (!socket || !socket.connected) return;
  socket.emit("leave-room", { roomId });
}
