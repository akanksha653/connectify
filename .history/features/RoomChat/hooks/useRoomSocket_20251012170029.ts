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

    // Listen to socket events
    const handleRooms = (rooms: Room[]) => setRooms(rooms);
    const handleRoomUsers = (users: Participant[]) => setCurrentRoomUsers(users);
    const handleRoomCreated = (room: Room) =>
      setEvents((prev) => [...prev, { type: ROOM_EVENTS.CREATED, payload: room }]);
    const handleRoomDeleted = (payload: any) =>
      setEvents((prev) => [...prev, { type: ROOM_EVENTS.DELETED, payload }]);
    const handleReceiveMessage = (msg: Message) =>
      setEvents((prev) => [...prev, { type: ROOM_EVENTS.MESSAGE_RECEIVE, payload: msg }]);

    socket.on("rooms", handleRooms);
    socket.on("room-users", handleRoomUsers);
    socket.on("room-created", handleRoomCreated);
    socket.on("room-deleted", handleRoomDeleted);
    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("rooms", handleRooms);
      socket.off("room-users", handleRoomUsers);
      socket.off("room-created", handleRoomCreated);
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket]);

  // Actions
  const createRoom = (payload: { name: string; topic: string; password?: string; maxUsers?: number }) => {
    socket?.emit(ROOM_EVENTS.CREATE, payload);
  };

  const joinRoom = (roomId: string, user: Participant, password?: string) => {
    socket?.emit(ROOM_EVENTS.JOIN, { roomId, user, password });
  };

  const leaveRoom = (roomId: string) => {
    socket?.emit(ROOM_EVENTS.LEAVE, { roomId });
  };

  const deleteRoom = (roomId: string) => {
    socket?.emit(ROOM_EVENTS.DELETE, { roomId });
  };

  const sendMessage = (roomId: string, message: Partial<Message>) => {
    socket?.emit(ROOM_EVENTS.MESSAGE_SEND, { roomId, message });
  };

  // Return socket explicitly along with everything else
  return useMemo(
    () => ({ socket, connected, rooms, currentRoomUsers, events, createRoom, joinRoom, leaveRoom, deleteRoom, sendMessage }),
    [socket, connected, rooms, currentRoomUsers, events]
  );
}
