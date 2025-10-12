// features/RoomChat/services/roomSocketService.ts
import { io, Socket } from "socket.io-client";
import type { Room } from "../utils/roomTypes";

let socket: Socket | null = null;

/**
 * Connects to the socket server.
 * Optionally takes a callback to receive live room updates.
 */
export function connectRoomSocket(onRoomsUpdated?: (rooms: Room[]) => void): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("🟢 Connected to room socket:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected from room socket");
    });

    // Listen for global room updates
    if (onRoomsUpdated) {
      socket.on("rooms-update", (rooms: Room[]) => {
        console.log("📡 Rooms update received:", rooms);
        onRoomsUpdated(rooms);
      });
    }

    // Listen for individual room creations
    socket.on("room-created", (room: Room) => {
      console.log("🆕 New room created:", room);
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

export function getRoomSocket(): Socket | null {
  return socket;
}

/**
 * Emit new room creation to server (real-time broadcast)
 */
export function createRoom(payload: { name: string; topic: string; description?: string }) {
  if (!socket || !socket.connected) {
    console.warn("⚠️ Socket not connected, room not emitted");
    return;
  }

  const newRoom: Room = {
    id: "socket-" + Math.random().toString(36).substring(2, 10),
    name: payload.name,
    topic: payload.topic,
    description: payload.description || "",
    users: [],
  };

  console.log("📤 Emitting create-room:", newRoom);
  socket.emit("create-room", newRoom);
}

/**
 * Join a specific room (for participants)
 */
export function joinRoom(roomId: string, userInfo: any) {
  if (socket && socket.connected) {
    console.log("👥 Joining room:", roomId);
    socket.emit("join-room", { roomId, userInfo });
  }
}
