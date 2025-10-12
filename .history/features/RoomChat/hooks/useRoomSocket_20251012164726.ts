// features/RoomSystem/hooks/useRoomSocket.ts
import { useEffect, useState, useMemo } from "react";
import { ROOM_EVENTS } from "../utils/roomEvents";
import type { Room, Participant, Message } from "../utils/roomTypes";
import { useSocket } from "./SocketProvider";

export function useRoomSocket() {
  const { socket, connected } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomUsers, setCurrentRoomUsers] = useState<Participant[]>([]);
  const [events, setEvents] = useState<{ type: string; payload: any }[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on("rooms", setRooms);
    socket.on("room-users", setCurrentRoomUsers);
    socket.on("room-created", (room) => setEvents((e) => [...e, { type: ROOM_EVENTS.CREATED, payload: room }]));
    socket.on("room-deleted", (payload) => setEvents((e) => [...e, { type: ROOM_EVENTS.DELETED, payload }]));
    socket.on("receive-message", (msg: Message) => setEvents((e) => [...e, { type: ROOM_EVENTS.MESSAGE_RECEIVE, payload: msg }]));

    return () => {
      socket.off("rooms");
      socket.off("room-users");
      socket.off("room-created");
      socket.off("room-deleted");
      socket.off("receive-message");
    };
  }, [socket]);

  const createRoom = (payload: { name: string; topic: string; password?: string; maxUsers?: number }) => {
    socket?.emit(ROOM_EVENTS.CREATE, payload);
  };
  const joinRoom = (roomId: string, user: any, password?: string) => socket?.emit(ROOM_EVENTS.JOIN, { roomId, user, password });
  const leaveRoom = (roomId: string) => socket?.emit(ROOM_EVENTS.LEAVE, { roomId });
  const deleteRoom = (roomId: string) => socket?.emit(ROOM_EVENTS.DELETE, { roomId });
  const sendMessage = (roomId: string, message: Partial<Message>) => socket?.emit(ROOM_EVENTS.MESSAGE_SEND, { roomId, message });

  return useMemo(
    () => ({ connected, rooms, currentRoomUsers, events, createRoom, joinRoom, leaveRoom, deleteRoom, sendMessage }),
    [connected, rooms, currentRoomUsers, events]
  );
}
