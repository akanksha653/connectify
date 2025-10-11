import { useEffect, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import {
  connectRoomSocket,
  disconnectRoomSocket,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  sendTyping,
} from "../services/roomSocketService";

export interface Room {
  id: string;
  name: string;
  topic: string;
  description?: string;
  hasPassword: boolean;
  password?: string | null;
  users?: { socketId: string; userInfo: any }[];
}

export interface RoomMessage {
  id: string;
  text: string;
  user: string | undefined;
  timestamp: string;
}

/** Hook to manage /rooms socket connection */
export default function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const s = connectRoomSocket();
    setSocket(s);

    // Listen for server updates
    s.on("rooms", (data: Room[]) => setRooms(data));
    s.on("room-created", (newRoom: Room) =>
      setRooms((prev) => [...prev, { ...newRoom, users: [] }])
    );
    s.on("room-update", (updatedRoom: Room) =>
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)))
    );

    return () => {
      disconnectRoomSocket();
      setSocket(null);
    };
  }, []);

  // --- Helpers ---
  const createRoom = useCallback(
    (room: Omit<Room, "id" | "users">) => {
      socket?.emit("create-room", room);
    },
    [socket]
  );

  const join = useCallback(
    (roomId: string, user: any) => {
      joinRoom(roomId, user);
    },
    [socket]
  );

  const leave = useCallback(
    (roomId: string, userId: string) => {
      leaveRoom(roomId, userId);
    },
    [socket]
  );

  const sendMessage = useCallback(
    (roomId: string, text: string) => {
      sendRoomMessage(roomId, text);
    },
    [socket]
  );

  const typing = useCallback(
    (roomId: string, userId: string) => {
      sendTyping(roomId, userId);
    },
    [socket]
  );

  return { socket, rooms, createRoom, join, leave, sendMessage, typing };
}
