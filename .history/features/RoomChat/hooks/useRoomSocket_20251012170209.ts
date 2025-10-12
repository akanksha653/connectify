// features/RoomSystem/hooks/useRoomSocket.ts
import { useEffect, useState, useRef, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import { ROOM_EVENTS } from "../utils/roomEvents";
import type { Room, Participant, Message } from "../utils/roomTypes";

const ROOM_SERVER_URL = process.env.NEXT_PUBLIC_ROOM_SERVER_URL || "http://localhost:3001/rooms";

export function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomUsers, setCurrentRoomUsers] = useState<Participant[]>([]);
  const [events, setEvents] = useState<{ type: string; payload: any }[]>([]);

  useEffect(() => {
    if (!socketRef.current) {
      const s = io(ROOM_SERVER_URL);
      socketRef.current = s;
      setSocket(s);

      s.on("connect", () => console.log("✅ Connected to room server:", s.id));
      s.on("disconnect", (reason) => console.log("❌ Disconnected from room server:", reason));

      // room events
      s.on(ROOM_EVENTS.USERS, setCurrentRoomUsers);
      s.on(ROOM_EVENTS.CREATED, (room) =>
        setEvents((e) => [...e, { type: ROOM_EVENTS.CREATED, payload: room }])
      );
      s.on(ROOM_EVENTS.DELETED, (payload) =>
        setEvents((e) => [...e, { type: ROOM_EVENTS.DELETED, payload }])
      );
      s.on(ROOM_EVENTS.MESSAGE_RECEIVE, (msg: Message) =>
        setEvents((e) => [...e, { type: ROOM_EVENTS.MESSAGE_RECEIVE, payload: msg }])
      );
      s.on("rooms", setRooms);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // room actions
  const createRoom = (payload: { name: string; topic: string; password?: string; maxUsers?: number }) => {
    socketRef.current?.emit(ROOM_EVENTS.CREATE, payload);
  };
  const joinRoom = (roomId: string, user: any) => socketRef.current?.emit(ROOM_EVENTS.JOIN, { roomId, user });
  const leaveRoom = (roomId: string) => socketRef.current?.emit(ROOM_EVENTS.LEAVE, { roomId });
  const deleteRoom = (roomId: string) => socketRef.current?.emit(ROOM_EVENTS.DELETE, { roomId });
  const sendMessage = (roomId: string, message: Partial<Message>) =>
    socketRef.current?.emit(ROOM_EVENTS.MESSAGE_SEND, { roomId, message });

  return useMemo(
    () => ({ socket, rooms, currentRoomUsers, events, createRoom, joinRoom, leaveRoom, deleteRoom, sendMessage }),
    [socket, rooms, currentRoomUsers, events]
  );
}
