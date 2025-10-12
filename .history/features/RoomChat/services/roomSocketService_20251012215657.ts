// features/RoomChat/services/roomSocketService.ts
import { io, Socket } from "socket.io-client";
import type { Room, Participant } from "../utils/roomTypes";

let socket: Socket | null = null;
const ROOM_NAMESPACE = "/rooms";

export function connectRoomSocket(onRoomsUpdated?: (rooms: Room[]) => void): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    socket = io(`${url}${ROOM_NAMESPACE}`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => console.log("✅ Room socket connected:", socket?.id));
    socket.on("disconnect", (reason) => console.log("❌ Room socket disconnected:", socket?.id, reason));

    // Listen for live rooms list
    socket.on("rooms", (rooms: Room[]) => {
      console.log("📡 Rooms list updated:", rooms);
      onRoomsUpdated?.(rooms);
    });

    // Optional logs for room creation / deletion
    socket.on("room-created", (room: Room) => console.log("🏠 Room created:", room));
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

export function getRoomSocket(): Socket | null {
  return socket;
}

export function createRoom(payload: { name: string; topic: string; description?: string }) {
  if (!socket || !socket.connected) return console.warn("⚠️ Socket not connected, cannot create room");
  console.log("📤 Emitting create-room:", payload);
  socket.emit("create-room", payload);
}

export function joinRoom(roomId: string, userInfo: Participant["userInfo"]) {
  if (!socket || !socket.connected) return console.warn("⚠️ Socket not connected, cannot join room");
  console.log("👥 Joining room:", roomId, userInfo);
  socket.emit("join-room", { roomId, user: { socketId: socket.id, userInfo } });
}

export function leaveRoom(roomId: string) {
  if (!socket || !socket.connected) return;
  console.log("↩️ Leaving room:", roomId);
  socket.emit("leave-room", { roomId });
}
