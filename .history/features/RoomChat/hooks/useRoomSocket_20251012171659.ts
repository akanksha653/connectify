import { useEffect, useState, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { ROOM_EVENTS } from "../utils/roomEvents";
import type { Room, Participant, Message } from "../utils/roomTypes";

const ROOM_SERVER_URL = process.env.NEXT_PUBLIC_ROOM_SERVER_URL || "http://localhost:3001/rooms";

export function useRoomSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomUsers, setCurrentRoomUsers] = useState<Participant[]>([]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      const s = io(ROOM_SERVER_URL);
      socketRef.current = s;
      setSocket(s);

      s.on("connect", () => setConnected(true));
      s.on("disconnect", () => setConnected(false));

      // Listen for rooms list
      s.on("rooms", (r: Room[]) => setRooms(r));

      // Listen for room users update
      s.on("room-users", (users: Participant[]) => setCurrentRoomUsers(users));
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const joinRoom = (roomId: string, user: any) => {
    socketRef.current?.emit(ROOM_EVENTS.JOIN, { roomId, user });
  };

  const leaveRoom = (roomId: string) => {
    socketRef.current?.emit(ROOM_EVENTS.LEAVE, { roomId });
    setCurrentRoomUsers([]);
  };

  const sendMessage = (roomId: string, message: Partial<Message>) => {
    socketRef.current?.emit(ROOM_EVENTS.MESSAGE_SEND, { roomId, message });
  };

  const createRoom = (payload: { name: string; topic: string }) => {
    socketRef.current?.emit(ROOM_EVENTS.CREATE, payload);
  };

  return useMemo(
    () => ({
      socket,
      connected,
      rooms,
      currentRoomUsers,
      joinRoom,
      leaveRoom,
      sendMessage,
      createRoom,
    }),
    [socket, connected, rooms, currentRoomUsers]
  );
}
