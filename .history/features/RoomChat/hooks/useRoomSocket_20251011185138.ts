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

export default function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const s = connectRoomSocket();
    setSocket(s);

    const handleRooms = (data: Room[]) => setRooms(data);
    const handleRoomCreated = (newRoom: Room) =>
      setRooms((prev) => [...prev, { ...newRoom, users: [] }]);
    const handleRoomUpdate = (updatedRoom: Room) =>
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
      );

    s.on("rooms", handleRooms);
    s.on("room-created", handleRoomCreated);
    s.on("room-update", handleRoomUpdate);

    return () => {
      s.off("rooms", handleRooms);
      s.off("room-created", handleRoomCreated);
      s.off("room-update", handleRoomUpdate);
      disconnectRoomSocket();
      setSocket(null);
    };
  }, []);

  const createRoom = useCallback(
    (room: Omit<Room, "id" | "users">) => {
      socket?.emit("create-room", room);
    },
    [socket]
  );

  const join = useCallback((roomId: string, user: any) => {
    if (!socket) return;
    joinRoom(socket, roomId, user);
  }, [socket]);

  const leave = useCallback((roomId: string, userId: string) => {
    if (!socket) return;
    leaveRoom(socket, roomId, userId);
  }, [socket]);

  const sendMessage = useCallback((roomId: string, text: string) => {
    if (!socket) return;
    sendRoomMessage(socket, roomId, text);
  }, [socket]);

  const typing = useCallback((roomId: string, userId: string) => {
    if (!socket) return;
    sendTyping(socket, roomId, userId);
  }, [socket]);

  return { socket, rooms, createRoom, join, leave, sendMessage, typing };
}
