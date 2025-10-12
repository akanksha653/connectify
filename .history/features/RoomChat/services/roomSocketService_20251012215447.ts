// features/RoomChat/services/roomSocketService.ts
import { io, Socket } from "socket.io-client";
import type { Room, Participant } from "../utils/roomTypes";

let socket: Socket | null = null;
const ROOM_NAMESPACE = "/rooms";

export function connectRoomSocket(onRoomsUpdated?: (rooms: Room[]) => void): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"}${ROOM_NAMESPACE}`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("🟢 Connected to room socket:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected from room socket");
    });

    // Global rooms update
    socket.on("rooms", (rooms: Room[]) => {
      console.log("📡 Rooms update received:", rooms);
      onRoomsUpdated?.(rooms);
    });

    // Individual room events (optional logging)
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

/**
 * Emit new room creation to server
 */
export function createRoom(payload: { name: string; topic: string; description?: string }) {
  if (!socket || !socket.connected) {
    console.warn("⚠️ Socket not connected, room not emitted");
    return;
  }

  console.log("📤 Emitting create-room:", payload);
  socket.emit("create-room", payload);
}

/**
 * Join a specific room (for participants)
 */
export function joinRoom(roomId: string, userInfo: Participant["userInfo"]) {
  if (!socket || !socket.connected) {
    console.warn("⚠️ Socket not connected, cannot join room");
    return;
  }

  console.log("👥 Joining room:", roomId, userInfo);
  socket.emit("join-room", { roomId, user: { socketId: socket.id, userInfo } });
}

/**
 * Leave a room
 */
export function leaveRoom(roomId: string) {
  if (!socket || !socket.connected) return;
  console.log("↩️ Leaving room:", roomId);
  socket.emit("leave-room", { roomId });
}
