// features/RoomChat/services/roomSocketService.ts
import { io, Socket } from "socket.io-client";
import type { Room } from "../utils/roomTypes";

let socket: Socket | null = null;

export function connectRoomSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });

    console.log("✅ Room socket connected:", socket.id);

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });
  }
  return socket;
}

export function disconnectRoomSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getRoomSocket() {
  return socket;
}

// ----------- Hybrid Room System Events -----------

// Notify server when a new room is created
export function emitCreateRoom(room: Room) {
  if (socket && socket.connected) {
    console.log("📢 Emitting new room:", room);
    socket.emit("create-room", room);
  }
}

// Listen for rooms created by others
export function onRoomCreated(callback: (room: Room) => void) {
  if (!socket) return;
  socket.on("room-created", callback);
}

// Listen for updated user lists
export function onUserJoined(callback: (roomId: string, users: any[]) => void) {
  if (!socket) return;
  socket.on("user-joined", callback);
}

// Join a public room
export function joinRoom(roomId: string, userInfo: any) {
  if (socket && socket.connected) {
    socket.emit("join-room", { roomId, userInfo });
  }
}

// Leave a room
export function leaveRoom(roomId: string) {
  if (socket && socket.connected) {
    socket.emit("leave-room", { roomId });
  }
}
