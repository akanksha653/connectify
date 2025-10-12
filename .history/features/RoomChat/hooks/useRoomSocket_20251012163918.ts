// features/RoomSystem/hooks/useRoomSocket.ts
import { useEffect, useMemo, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { ROOM_EVENTS } from "../utils/roomEvents";
import type { Room, Participant, Message } from "../utils/roomTypes";

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

export function useRoomSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomUsers, setCurrentRoomUsers] = useState<Participant[]>([]);
  const [events, setEvents] = useState<{ type: string; payload: any }[]>([]);

  useEffect(() => {
    const socket = io(`${SIGNALING_URL}/rooms`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("rooms", (r: Room[]) => {
      setRooms(r || []);
    });

    socket.on("room-users", (users: Participant[]) => {
      setCurrentRoomUsers(users || []);
    });

    socket.on("room-created", (room: Room) => {
      setEvents((e) => [...e, { type: ROOM_EVENTS.CREATED, payload: room }]);
    });

    socket.on("room-deleted", (payload) => {
      setEvents((e) => [...e, { type: ROOM_EVENTS.DELETED, payload }]);
    });

    socket.on("receive-message", (msg: Message) => {
      setEvents((e) => [...e, { type: ROOM_EVENTS.MESSAGE_RECEIVE, payload: msg }]);
    });

    socket.on("connected", () => {
      // server greeted us; can be used for debug
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const createRoom = async (payload: { name: string; topic: string; description?: string; password?: string }) => {
    socketRef.current?.emit(ROOM_EVENTS.CREATE, payload);
  };

  const joinRoom = (roomId: string, user: any) => {
    socketRef.current?.emit(ROOM_EVENTS.JOIN, { roomId, user });
  };

  const leaveRoom = (roomId: string) => {
    socketRef.current?.emit(ROOM_EVENTS.LEAVE, { roomId });
  };

  const deleteRoom = (roomId: string) => {
    socketRef.current?.emit(ROOM_EVENTS.DELETE, { roomId });
  };

  const sendMessage = (roomId: string, message: Partial<Message>) => {
    socketRef.current?.emit(ROOM_EVENTS.MESSAGE_SEND, { roomId, message });
  };

  const loadMessages = (payload: { roomId: string; limit?: number; lastMessageId?: string | null }) => {
    socketRef.current?.emit("load-messages", payload);
  };

  const on = (eventName: string, cb: (...args: any[]) => void) => {
    socketRef.current?.on(eventName, cb);
    return () => socketRef.current?.off(eventName, cb);
  };

  return useMemo(
    () => ({
      socket: socketRef.current,
      connected,
      rooms,
      currentRoomUsers,
      events,
      createRoom,
      joinRoom,
      leaveRoom,
      deleteRoom,
      sendMessage,
      loadMessages,
      on,
    }),
    [connected, rooms, currentRoomUsers, events]
  );
}
